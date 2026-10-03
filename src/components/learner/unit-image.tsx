import type { UnitImage } from "@/lib/content/didaktik";

export function UnitImageView({
  image,
  className = "",
}: {
  image: UnitImage;
  className?: string;
}) {
  return (
    <figure className={`mt-3 ${className}`}>
      {/* Phase A: local generated SVG — next/image not required */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt}
        className="mx-auto max-h-56 w-full object-contain"
      />
      {image.longDescription ? (
        <figcaption className="mt-2 text-xs leading-5 text-[var(--color-text-secondary)]">
          {image.longDescription}
          <span className="mt-1 block">
            Lizenz: {image.source.license}
            {image.source.attribution ? ` · ${image.source.attribution}` : ""}
          </span>
        </figcaption>
      ) : (
        <figcaption className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Lizenz: {image.source.license}
        </figcaption>
      )}
    </figure>
  );
}
