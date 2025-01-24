import ChessBoard from '@/components/chess/ChessBoard'

export default function Home() {
  return (
    <main className="h-[100dvh] w-full overflow-hidden flex items-center justify-center bg-[#2c2c2c] dark:bg-[#1c1c1c]">
      <ChessBoard />
    </main>
  )
}
