/**
 * Embeddable video block for lessons. Supports YouTube, Vimeo and direct .mp4.
 * Responsive 16:9, KSE-styled frame, optional title above.
 * Renders nothing when `url` is empty.
 */

interface VideoBlockProps {
  url: string;
  title?: string;
}

type Embed =
  | { kind: "iframe"; src: string }
  | { kind: "video"; src: string }
  | null;

/** Convert a YouTube / Vimeo watch URL to an embeddable src, or detect .mp4. */
function resolveEmbed(raw: string): Embed {
  const url = raw.trim();
  if (!url) return null;

  // Direct video file.
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    return { kind: "video", src: url };
  }

  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/.
  const yt =
    url.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i,
    );
  if (yt) {
    return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  }

  // Vimeo: vimeo.com/<id> or player.vimeo.com/video/<id>.
  const vimeo = url.match(
    /vimeo\.com\/(?:video\/)?(\d+)/i,
  );
  if (vimeo) {
    return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  }

  // Already an embed-style iframe URL — pass it through.
  if (/youtube\.com\/embed\/|player\.vimeo\.com\/video\//i.test(url)) {
    return { kind: "iframe", src: url };
  }

  return null;
}

export default function VideoBlock({ url, title }: VideoBlockProps) {
  const embed = resolveEmbed(url);
  if (!embed) return null;

  return (
    <figure className="my-6">
      {title ? (
        <figcaption className="mb-2 text-sm font-medium uppercase tracking-wide text-kse-navy">
          {title}
        </figcaption>
      ) : null}
      <div className="relative w-full overflow-hidden rounded-xl border border-kse-line bg-kse-navy shadow-sm">
        {/* 16:9 responsive box */}
        <div className="relative w-full pt-[56.25%]">
          {embed.kind === "iframe" ? (
            <iframe
              src={embed.src}
              title={title ?? "Embedded video"}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <video
              src={embed.src}
              controls
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full bg-black"
            />
          )}
        </div>
      </div>
    </figure>
  );
}
