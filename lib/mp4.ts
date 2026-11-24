import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

export const mp4Supported = () => typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

/** Encode frame demi frame ke MP4 (H.264) langsung di browser lewat WebCodecs. */
export async function encodeMp4(o: {
  w: number; h: number; fps: number; n: number;
  frame: (i: number) => Promise<CanvasImageSource>;
  onProgress: (p: number) => void; signal: AbortSignal;
}): Promise<Blob> {
  if (!mp4Supported()) throw new Error('Browser belum mendukung WebCodecs');
  const bitrate = Math.round(o.w * o.h * 5.5);
  let codec = '';
  for (const c of ['avc1.640028', 'avc1.4d0028', 'avc1.42002a']) {
    const s = await VideoEncoder.isConfigSupported({ codec: c, width: o.w, height: o.h, bitrate, framerate: o.fps });
    if (s.supported) { codec = c; break; }
  }
  if (!codec) throw new Error('Encoder H.264 tidak tersedia di perangkat ini');
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: o.w, height: o.h }, fastStart: 'in-memory' });
  let err: any = null;
  const enc = new VideoEncoder({ output: (ch, meta) => muxer.addVideoChunk(ch, meta), error: e => { err = e; } });
  enc.configure({ codec, width: o.w, height: o.h, bitrate, framerate: o.fps });
  try {
    for (let i = 0; i < o.n; i++) {
      if (o.signal.aborted) throw new DOMException('dibatalkan', 'AbortError');
      if (err) throw err;
      const src = await o.frame(i);
      const vf = new VideoFrame(src, { timestamp: Math.round(i * 1e6 / o.fps), duration: Math.round(1e6 / o.fps) });
      enc.encode(vf, { keyFrame: i % o.fps === 0 });
      vf.close();
      while (enc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 8));
      o.onProgress((i + 1) / o.n);
    }
    await enc.flush();
  } finally { if (enc.state !== 'closed') enc.close(); }
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}
