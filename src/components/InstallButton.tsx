import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// Shows an "Install" button when the browser offers PWA installation
// (Chromium-based browsers on desktop — incl. Ubuntu — and Android). It stays
// hidden on browsers that don't fire `beforeinstallprompt`, such as iOS Safari,
// where users install via Share → Add to Home Screen instead.
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<any>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // stash it so we can trigger the prompt on click
      setPromptEvent(e);
    };
    const onInstalled = () => setPromptEvent(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!promptEvent) return null;

  return (
    <button
      onClick={async () => {
        promptEvent.prompt();
        await promptEvent.userChoice;
        setPromptEvent(null);
      }}
      className="flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-3 py-2 transition-colors"
      aria-label="Install app"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install</span>
    </button>
  );
}
