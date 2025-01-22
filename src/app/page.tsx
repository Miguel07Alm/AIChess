import ChessBoard from '@/components/chess/ChessBoard'

export default function Home() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#2c2c2c] dark:bg-[#1c1c1c] py-4">
      <ChessBoard />
    </main>
  )
}
