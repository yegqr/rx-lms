import Image from "next/image";

/**
 * KSE mark + "Disruption course" wordmark.
 * The mark sits in a white chip so the navy "KSE" is visible on ANY background.
 * Pass onDark for navy/coloured backgrounds (white wordmark).
 */
export function Logo({
  size = 30,
  withWordmark = true,
  onDark = false,
}: {
  size?: number;
  withWordmark?: boolean;
  onDark?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid place-items-center rounded-md bg-white p-1 shadow-sm"
        style={{ width: size + 8, height: size + 8 }}
      >
        <Image src="/brand/kse-mark.png" alt="KSE" width={size} height={size} priority />
      </span>
      {withWordmark && (
        <span
          className={
            onDark
              ? "text-[15px] font-semibold tracking-tight text-white"
              : "text-[15px] font-semibold tracking-tight text-kse-navy"
          }
        >
          Disruption course
        </span>
      )}
    </div>
  );
}
