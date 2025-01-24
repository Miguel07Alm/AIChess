import { Card } from "../ui/card";
import { Chess, Move } from "chess.js";
import { Badge } from "../ui/badge";
import { Chart } from "./Chart";
import { motion } from "framer-motion";
import {
    ArrowUpRight,
    ArrowDownRight,
    Swords,
    Shield,
    Target,
    Crown,
    RotateCw,
} from "lucide-react";
import Image from "next/image";
interface GameStatsProps {
    game: Chess;
    moves: Move[];
}

export const GameStats = ({ game, moves }: GameStatsProps) => {
    const whiteCaptures = moves.filter(
        (m) => m.captured && m.color === "w"
    ).length;
    const blackCaptures = moves.filter(
        (m) => m.captured && m.color === "b"
    ).length;
    const whiteChecks = moves.filter(
        (m) => m.san.includes("+") && m.color === "w"
    ).length;
    const blackChecks = moves.filter(
        (m) => m.san.includes("+") && m.color === "b"
    ).length;

    // Nuevas estadísticas
    const whiteCastles = moves.filter(
        (m) => (m.san === "O-O" || m.san === "O-O-O") && m.color === "w"
    ).length;
    const blackCastles = moves.filter(
        (m) => (m.san === "O-O" || m.san === "O-O-O") && m.color === "b"
    ).length;
    const whitePromotions = moves.filter(
        (m) => m.san.includes("=") && m.color === "w"
    ).length;
    const blackPromotions = moves.filter(
        (m) => m.san.includes("=") && m.color === "b"
    ).length;
    const knightMoves = moves.filter((m) => m.piece === "n").length;
    const averageMovesPerTurn = (moves.length / 2).toFixed(1);

    return (
        <Card className="p-3 flex flex-col h-full">
            <h3 className="text-sm font-medium mb-3">Game Statistics</h3>
            <div className="flex-1 flex flex-col min-h-0">
                {/* Basic stats grid - altura fija */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <Swords className="w-4 h-4 text-red-500" />
                        <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                                Captures
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">
                                    White: {whiteCaptures}
                                </span>
                                <span className="text-sm">
                                    Black: {blackCaptures}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-500" />
                        <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                                Checks
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">
                                    White: {whiteChecks}
                                </span>
                                <span className="text-sm">
                                    Black: {blackChecks}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Nuevas estadísticas */}
                    <div className="flex items-center gap-2">
                        <RotateCw className="w-4 h-4 text-blue-500" />
                        <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                                Castles
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">
                                    White: {whiteCastles}
                                </span>
                                <span className="text-sm">
                                    Black: {blackCastles}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                                Promotions
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">
                                    White: {whitePromotions}
                                </span>
                                <span className="text-sm">
                                    Black: {blackPromotions}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Image
                            src={"/w_n.svg"}
                            alt={`Knight icon`}
                            className={'object-contain select-none pointer-events-none text-purple-500'}
                            priority
                            width={16}
                            height={16}
                            draggable={false}
                        />
                        <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                                Knight Moves
                            </div>
                            <div className="text-sm">{knightMoves}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        <div className="flex-1">
                            <div className="text-xs text-muted-foreground">
                                Avg. Moves/Turn
                            </div>
                            <div className="text-sm">{averageMovesPerTurn}</div>
                        </div>
                    </div>
                </div>

                {/* Chart container - resto del espacio disponible */}
                <div className="flex-1 min-h-0 relative">
                    <Chart moves={moves} />
                </div>

                {/* Game Phase & Status - altura fija */}
                <div className="flex gap-2 mt-3">
                    <Badge variant="outline" className="flex-1 justify-center">
                        {moves.length < 10
                            ? "Opening"
                            : moves.length < 30
                            ? "Middlegame"
                            : "Endgame"}
                    </Badge>
                    <Badge
                        variant={game.isCheck() ? "destructive" : "default"}
                        className="flex-1 justify-center"
                    >
                        {game.isCheck() ? "Check" : "Active"}
                    </Badge>
                </div>
            </div>
        </Card>
    );
};
