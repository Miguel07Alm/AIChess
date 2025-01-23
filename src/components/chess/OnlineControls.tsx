"use client";
import { useState, useEffect } from "react";
import { useRTC } from "@/contexts/RTCContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Copy, Users, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useGame } from "@/contexts/GameContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerFooter,
} from "../ui/drawer";
import { cn } from "@/lib/utils";

export const OnlineControls = () => {
    const {
        isConnected,
        roomId,
        createGame,
        joinGame,
        error,
        playerColor,
        disconnect,
        setIsConnected,
        expiresIn,
    } = useRTC();
    const { setGameMode, isGameStarted, gameMode } = useGame();
    const [joinId, setJoinId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detectar si es móvil
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleCreateGame = async () => {
        try {
            console.log("Creating new game...");
            setIsLoading(true);
            const newRoomId = await createGame();
            console.log("Game created:", { roomId: newRoomId });
            setShowDialog(true);
            setIsConnected(true);

            toast.success("Room created! Share the ID with your opponent");
        } catch (error) {
            console.error("Failed to create game:", error);
            toast.error("Failed to create room");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinGame = async () => {
        if (!joinId) return;
        try {
            console.log("Joining game:", { roomId: joinId });
            setIsLoading(true);
            await joinGame(joinId);
            console.log("Successfully joined game");
            toast.success("Joined game successfully!");
        } catch (error) {
            console.error("Failed to join game:", { roomId: joinId, error });
            toast.error("Failed to join game");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveGame = () => {
        disconnect(); // Usar el nuevo método
        setGameMode(null);
    };

    // Mostrar toast cuando se asigna el color
    useEffect(() => {
        if (playerColor) {
            toast.success(
                `You are playing as ${playerColor === "w" ? "White" : "Black"}`,
                {
                    duration: 5000,
                    className: "font-medium text-lg",
                }
            );
        }
    }, [playerColor]);

    // Modificar el efecto de reconexión automática
    useEffect(() => {
        const storedRoomId = localStorage.getItem("lastRoomId");
        
        // Solo intentar reconectar si tenemos un roomId guardado Y no estamos ya conectados
        if (storedRoomId && !isConnected && !roomId) {
            // En lugar de reconectar automáticamente, rellenar el input
            setJoinId(storedRoomId);
            // Mostrar el diálogo/drawer
            setShowDialog(true);
            // Limpiar el localStorage para evitar reconexiones no deseadas
            localStorage.removeItem("lastRoomId");
        }
    }, [isConnected, roomId]);

    // Modificar la lógica de almacenamiento
    useEffect(() => {
        // Solo guardar el roomId cuando estamos conectados exitosamente
        if (isConnected && roomId) {
            localStorage.setItem("lastRoomId", roomId);
        }

        return () => {
            // Limpiar al desmontar si no estamos conectados
            if (!isConnected) {
                localStorage.removeItem("lastRoomId");
            }
        };
    }, [isConnected, roomId]);

    useEffect(() => {
      if (gameMode === "online" && !isConnected && !isGameStarted) {
        setShowDialog(true);
      }
    }, [gameMode])

    if (error) {
        toast.error(error);
    }

    const ConnectedState = () => (
        <Card className="p-4">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                                Room: {roomId}
                            </span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    navigator.clipboard.writeText(roomId!);
                                    toast.success("Room ID copied");
                                }}
                            >
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
                        {expiresIn && expiresIn < 300 && (
                            <span className="text-xs text-yellow-500">
                                Expires in {Math.floor(expiresIn / 60)}m{" "}
                                {expiresIn % 60}s
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span
                        className={`text-sm ${
                            isConnected ? "text-green-500" : "text-yellow-500"
                        }`}
                    >
                        {playerColor === "w"
                            ? "Playing as White"
                            : "Playing as Black"}
                    </span>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleLeaveGame}
                    >
                        Leave
                    </Button>
                </div>
            </div>
        </Card>
    );

    const JoinGameUI = () => {
        // Prevenir pérdida de foco
        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            handleJoinGame();
        };

        return (
            <div className="space-y-4">
                <Button
                    onClick={handleCreateGame}
                    disabled={isLoading}
                    className="w-full"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Game
                        </>
                    )}
                </Button>

                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Or join existing game:
                    </p>
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            autoFocus
                            placeholder="Room ID"
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value)}
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            disabled={isLoading || !joinId}
                            className="shrink-0"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Join"
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        );
    };

    // Render logic
    if (isConnected) {
        return <ConnectedState />;
    }
    const onOpenChange = (isOpen: boolean) => {
        setShowDialog(isOpen);
        if (!isOpen) {
          setGameMode(null);
        }
    }
    return (
        <div className="w-full">

            {/* Modal para crear/unirse a juego */}
            {isMobile ? (
                <Drawer open={showDialog} onOpenChange={onOpenChange}>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Create or Join Game</DrawerTitle>
                        </DrawerHeader>
                        <div className="p-4">
                            <JoinGameUI />
                        </div>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={showDialog} onOpenChange={onOpenChange}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create or Join Game</DialogTitle>
                            <DialogDescription>
                                Create a new game or join an existing one
                            </DialogDescription>
                        </DialogHeader>
                        <JoinGameUI />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};
