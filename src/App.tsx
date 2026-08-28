import Masonry from 'react-masonry-css';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MagicSelectItem } from '@/components/ui/magic-select-item';

const R2_BASE = 'https://pub-b3d3886e46d8446f98e072687a965226.r2.dev';

function parseGroupDate(s: string): number {
  const parts = s.split(' ');
  if (parts.length !== 2) return Infinity;
  return new Date(`${parts[0]} 1, ${parts[1]}`).getTime();
}

function LazyImage({ src, width, height }: { src: string; width?: number; height?: number }) {
  const [loaded, setLoaded] = useState(false);
  const hasDimensions = Boolean(width && height);

  return (
    <div
      className="relative w-full overflow-hidden rounded bg-gray-200"
      style={hasDimensions ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`rounded transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'
          } ${hasDimensions ? 'absolute inset-0 w-full h-full object-cover' : 'block w-full h-auto'}`}
      />
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent background scrolling while the lightbox is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
        onClick={onClose}
        aria-label="Close"
      >
        &times;
      </button>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()} // clicking the image itself shouldn't close it
      />
    </div>
  );
}

function ImageCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`rounded-xl border bg-background overflow-hidden ${className ?? ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function App() {
  const [allFiles, setAllFiles] = useState <
  { filename: string; date: string | null; thumbnail ?: string; width ?: number; height ?: number } []
    > ([]);
  const [groups, setGroups] = useState<Record<string, string[]>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const dimensionsByFilename = useMemo(() => {
    const map = new Map<string, { width?: number; height?: number }>();
    for (const f of allFiles) {
      map.set(f.filename, { width: f.width, height: f.height });
    }
    return map;
  }, [allFiles]);
  

  useEffect(() => {
    // `cancelled` guards against calling setState after the component
    // has unmounted (e.g. if the user navigates away before the fetch
    // finishes). Without this, React can throw a warning about
    // updating state on an unmounted component, or worse, cause a
    // subtle bug where stale data overwrites newer state.
    let cancelled = false;

    async function loadManifest() {
      // Reset state at the start of every fetch attempt. This matters
      // if loadManifest can ever run more than once (e.g. a retry
      // button), so old errors/loading state don't linger.
      setIsLoading(true);
      setError(null);

      try {
        // Kick off the network request for the manifest file.
        const r = await fetch('/manifest.json');

        // fetch() only rejects on network-level failures (e.g. DNS
        // errors, no connection). It does NOT reject on HTTP error
        // codes like 404 or 500 — those still resolve "successfully".
        // So we manually check r.ok and throw if the server returned
        // an error status.
        if (!r.ok) {
          throw new Error(`Failed to load manifest: ${r.status} ${r.statusText}`);
        }

        // Parse the response body as JSON. This can also throw if the
        // response isn't valid JSON, which will be caught below.
        const entries: { filename: string; date: string | null; thumbnail?: string; width?: number; height?: number }[] = await r.json();

        // If the component unmounted while we were waiting on the
        // fetch/parse above, bail out before touching state.
        if (cancelled) return;

        // Store the full, unfiltered list of files (including videos)
        // in case other parts of the UI need access to everything.
        setAllFiles(entries);

        // Build a new object that groups filenames by their date.
        const grouped: Record<string, string[]> = {};

        for (const { filename, date } of entries) {
          // Skip video files (.mp4, .mov, .webm) — this grouped view
          // is only meant to show non-video files. The `i` flag makes
          // the match case-insensitive (so .MP4 is also skipped).
          if (/\.(mp4|mov|webm)$/i.test(filename)) continue;

          // Some files might have a null date (e.g. missing metadata).
          // Fall back to a shared "Unknown date" bucket for those.
          const label = date ?? 'Unknown date';

          // Append this filename to the array for its date, creating
          // the array first if this is the first file for that date.
          grouped[label] = [...(grouped[label] ?? []), filename];
        }

        // Save the finished grouped structure to state for rendering.
        setGroups(grouped);

      } catch (err) {
        // Only update state if the component is still mounted.
        if (!cancelled) {
          // Log the raw error for debugging purposes.
          console.error('Error loading manifest:', err);

          // err is typed as `unknown` by TypeScript (we can't assume
          // what was thrown), so narrow it before reading .message.
          setError(err instanceof Error ? err.message : 'Something went wrong loading files.');
        }
      } finally {
        // Whether the fetch succeeded or failed, stop showing the
        // spinner — but again, only if we're still mounted.
        if (!cancelled) setIsLoading(false);
      }
    }

    // Actually run the async function (useEffect callbacks can't be
    // async themselves, so we define and call an inner function).
    loadManifest();

    // Cleanup function: React calls this when the component unmounts
    // (or before the effect re-runs, though here it never will since
    // the dependency array is empty). Setting cancelled = true tells
    // any in-flight fetch to ignore its result.
    return () => { cancelled = true; };
  }, []); // Empty dependency array = run once, on mount only.

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 50, allFiles.length));
        }
      },
      { rootMargin: '1000px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [allFiles.length]);

  useEffect(() => {
    if (!pendingScrollId) return;

    let attempts = 0;
    const maxAttempts = 20; // bumped up since a full re-render of all images takes longer

    function tryScroll() {
      const el = document.getElementById(pendingScrollId!);
      if (!el) {
        attempts++;
        if (attempts < maxAttempts) requestAnimationFrame(tryScroll);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth' });
    }

    requestAnimationFrame(() => requestAnimationFrame(tryScroll));

    const settleTimer = setTimeout(() => {
      const el = document.getElementById(pendingScrollId!);
      el?.scrollIntoView({ behavior: 'smooth' });
      setPendingScrollId(null);
    }, 600);

    return () => clearTimeout(settleTimer);
  }, [visibleCount, pendingScrollId]);

  // While the fetch is in progress, show a spinner instead of content.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        {/* A simple CSS spinner: a circle with one colored border side,
          spun continuously via the animate-spin utility class. */}
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
      </div>
    );
  }

  // If the fetch failed, show the error message instead of the file list.
  if (error) {
    return (
      <div className="text-red-600 py-4">
        Couldn't load files: {error}
      </div>
    );
  }

  const videoFiles = allFiles.filter(({ filename }) => /\.(mp4|mov|webm)$/i.test(filename));

  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    const diff = parseGroupDate(a) - parseGroupDate(b);
    return sortOrder === 'asc' ? diff : -diff;
  });

  const byYear = Object.keys(groups)
    .filter(k => k !== 'Unknown date')
    .sort((a, b) => parseGroupDate(a) - parseGroupDate(b))
    .reduce<Record<string, string[]>>((acc, monthYear) => {
      const year = monthYear.split(' ')[1];
      acc[year] = [...(acc[year] ?? []), monthYear];
      return acc;
    }, {});

  // Flatten the grouped structure (month -> filenames[]) into a single
  // ordered array of { month, filename } pairs. This is needed because
  // slicing by "number of images" only makes sense on a flat list —
  // you can't easily slice "the first 50 items" out of a nested
  // Record<string, string[]> while preserving order across groups.
  const flatItems = sortedGroups.flatMap(([month, filenames]) =>
    filenames.map((filename) => ({ month, filename }))
  );

  // Take only the first `visibleCount` items from the flat list. As
  // visibleCount grows (e.g. via the IntersectionObserver sentinel),
  // this window grows too, revealing more images without re-fetching
  // anything — the data's already in `flatItems`, we're just slicing
  // further into it.
  const visibleItems = flatItems.slice(0, visibleCount);

  // Re-group the sliced flat list back into [month, filenames[]] pairs
  // so it can be rendered the same way `visibleGroups` was — one
  // <Masonry> block per month, with a heading.
  const visibleGroups = visibleItems.reduce<[string, string[]][]>((acc, { month, filename }) => {
    // Look at the last group we've built so far.
    const last = acc[acc.length - 1];

    // Since visibleItems is still in order (flatItems was ordered,
    // and slice() preserves order), consecutive items belonging to
    // the same month will always be adjacent. So if the last group's
    // month matches this item's month, just append to it...
    if (last && last[0] === month) {
      last[1].push(filename);
    } else {
      // ...otherwise, this is the first item of a new month, so start
      // a new [month, [filename]] group and push it onto the array.
      acc.push([month, [filename]]);
    }

    return acc;
  }, []); // Start with an empty array of groups.

  return (
    <div className="px-8 pt-4 gap-4">
      <header className="sticky top-0 z-50 bg-background p-4 flex gap-4 shadow-md items-center">
        <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as 'asc' | 'desc')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <MagicSelectItem value="asc">Oldest first</MagicSelectItem>
            <MagicSelectItem value="desc">Newest first</MagicSelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(val) => {
          if (val === 'videos') {
            setVisibleCount(flatItems.length); // render ALL images first
            setPendingScrollId('videos');
            return;
          }
          const idx = flatItems.findIndex((item) => item.month === val);
          if (idx >= 0 && idx >= visibleCount) {
            setVisibleCount(idx + 50);
          }
          setPendingScrollId(val.replace(/\s/g, '-'));
        }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Jump to month..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(byYear).map(([year, months]) => (
              <SelectGroup key={year}>
                <SelectLabel>{year}</SelectLabel>
                {months.map((monthYear) => (
                  <MagicSelectItem key={monthYear} value={monthYear}>
                    {monthYear.split(' ')[0]}
                  </MagicSelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectGroup>
              <SelectLabel>Other</SelectLabel>
              <MagicSelectItem value="videos">Videos</MagicSelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </header>

      {visibleGroups.map(([month, filenames]) => (
        <div key={month} id={month.replace(/\s/g, '-')} className="mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-4">{month}</h2>
          <Masonry
            breakpointCols={{ default: 3, 768: 2, 480: 1 }}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {filenames.map((filename) => (
              <ImageCard
                key={filename}
                className="cursor-pointer mb-4"
                onClick={() => setSelectedImage(`${R2_BASE}/${filename}`)}
              >
                <LazyImage
                  src={`${R2_BASE}/${filename}`}
                  width={dimensionsByFilename.get(filename)?.width}
                  height={dimensionsByFilename.get(filename)?.height}
                />
              </ImageCard>
            ))}
          </Masonry>
        </div>
      ))}
      {visibleCount < flatItems.length && (
        <div ref={sentinelRef} className="h-1" />
      )}

      {videoFiles.length > 0 && (
        <div id="videos" className="mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-4">Videos</h2>
          <Masonry
            breakpointCols={{ default: 3, 768: 2, 480: 1 }}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {videoFiles.map(({ filename, thumbnail }) => (
              <ImageCard key={filename} className="cursor-pointer mb-4">
                <video
                  src={`${R2_BASE}/${filename}`}
                  poster={thumbnail ? `${R2_BASE}/${thumbnail}` : undefined}
                  controls
                  preload="none"
                  className="w-full"
                  onError={(e) => {
                    (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                  }}
                />
              </ImageCard>
            ))}
          </Masonry>
        </div>
      )}
      {selectedImage && (
        <Lightbox src={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
}

export default App;
