import ChessBoard from '@/components/chess/ChessBoard'
import { ChessBackground } from '@/components/chess/ChessBackground'
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function Home() {
  return (
      <main className="h-[100dvh] w-full fixed inset-0 overflow-hidden">
          <div className="fixed top-4 right-4 z-[60]">
              <ThemeToggle />
          </div>
          <ChessBackground />
          <div className="relative z-10 h-full w-full">
              <ChessBoard />
          </div>
      </main>
  );
}
