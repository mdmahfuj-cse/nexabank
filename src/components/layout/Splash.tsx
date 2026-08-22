import { Wordmark } from '@/components/brand/Wordmark';
import { Guilloche } from '@/components/brand/Guilloche';

/**
 * Full-page hold while the session is restored.
 *
 * Deliberately branded rather than a bare spinner: this is the first frame a
 * returning visitor sees, and a flash of an empty page reads as a broken app.
 */
export function Splash({ label = 'Restoring your session' }: { label?: string }) {
  return (
    <div className="engraved-plate relative grid min-h-dvh place-items-center overflow-hidden text-white">
      <Guilloche
        seed={918273}
        layers={3}
        className="absolute -right-32 -top-24 size-[36rem] animate-engrave text-white/[0.06]"
      />

      <div className="relative flex flex-col items-center gap-6">
        <Wordmark size="md" className="text-white" />
        <div className="flex items-center gap-2.5 text-white/45">
          <span className="size-3.5 animate-spin rounded-full border-2 border-white/20 border-t-[#6FD9B4]" />
          <p className="eyebrow">{label}</p>
        </div>
      </div>
    </div>
  );
}
