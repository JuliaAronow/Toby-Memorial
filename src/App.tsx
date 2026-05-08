import Masonry from 'react-masonry-css';
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MagicCard } from '@/components/ui/magic-card';

const R2_BASE = 'https://pub-b3d3886e46d8446f98e072687a965226.r2.dev';

function parseGroupDate(s: string): number {
  const parts = s.split(' ');
  if (parts.length !== 2) return Infinity;
  return new Date(`${parts[0]} 1, ${parts[1]}`).getTime();
}

function App() {
  const [allFiles, setAllFiles] = useState<{ filename: string; date: string | null }[]>([]);
  const [groups, setGroups] = useState<Record<string, string[]>>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetch('/manifest.json')
      .then(r => r.json())
      .then((entries: { filename: string; date: string | null }[]) => {
        setAllFiles(entries);
        const grouped: Record<string, string[]> = {};
        for (const { filename, date } of entries) {
          if (/\.(mp4|mov|webm)$/i.test(filename)) continue;
          const label = date ?? 'Unknown date';
          grouped[label] = [...(grouped[label] ?? []), filename];
        }
        setGroups(grouped);
      });
  }, []);

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

  function removeFromUI(filename: string) {
    setGroups(prev => {
      const next = { ...prev };
      for (const key in next) {
        next[key] = next[key].filter(f => f !== filename);
        if (next[key].length === 0) delete next[key];
      }
      return next;
    });
  }

  return (
    <div className="px-8 pt-4 gap-4">
      <header className="sticky top-0 z-50 bg-background p-4 flex gap-4 shadow-md items-center">
        <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as 'asc' | 'desc')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Oldest first</SelectItem>
            <SelectItem value="desc">Newest first</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(val) => {
          const id = val.replace(/\s/g, '-');
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Jump to month..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(byYear).map(([year, months]) => (
              <SelectGroup key={year}>
                <SelectLabel>{year}</SelectLabel>
                {months.map((monthYear) => (
                  <SelectItem key={monthYear} value={monthYear}>
                    {monthYear.split(' ')[0]}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectGroup>
              <SelectLabel>Other</SelectLabel>
              <SelectItem value="videos">Videos</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <button
          onClick={() => setEditMode(e => !e)}
          className={`ml-auto px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            editMode
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </header>

      {sortedGroups.map(([month, filenames]) => (
        <div key={month} id={month.replace(/\s/g, '-')} className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{month}</h2>
          <Masonry
            breakpointCols={{ default: 3, 768: 2, 480: 1 }}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {filenames.map((filename) => (
              <MagicCard
                key={filename}
                className="cursor-pointer mb-4"
                gradientColor="#D9D9D955"
              >
                <div className="relative">
                  <img
                    src={`${R2_BASE}/${filename}`}
                    alt=""
                    loading="lazy"
                    className="w-full block min-h-32"
                  />
                  {editMode && (
                    <button
                      onClick={() => removeFromUI(filename)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </MagicCard>
            ))}
          </Masonry>
        </div>
      ))}

      {videoFiles.length > 0 && (
        <div id="videos" className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Videos</h2>
          <Masonry
            breakpointCols={{ default: 3, 768: 2, 480: 1 }}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {videoFiles.map(({ filename }) => (
              <MagicCard
                key={filename}
                className="cursor-pointer mb-4"
                gradientColor="#D9D9D955"
              >
                <video
                  src={`${R2_BASE}/${filename}`}
                  controls
                  preload="none"
                  className="w-full"
                  onError={(e) => {
                    (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                  }}
                />
              </MagicCard>
            ))}
          </Masonry>
        </div>
      )}
    </div>
  );
}

export default App;
