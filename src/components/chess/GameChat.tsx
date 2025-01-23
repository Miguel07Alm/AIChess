import { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { MessageSquare, Send, Minimize2, Maximize2, X } from 'lucide-react';
import { useRTC } from '@/contexts/RTCContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { ChatMessage } from '@/types/webrtc';
import { cn } from '@/lib/utils';

export const GameChat = () => {
    const { messages, gameMode, aiThinking, sendAIMessage, setMessages } = useGame();
    const { playerColor, sendChatMessage } = useRTC();
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;
        if (gameMode === "online") {
            const newMessage: ChatMessage = {
                text,
                sender: playerColor,
                timestamp: Date.now(),
                isSystem: false
            };
            setMessages([...messages, newMessage]);
            sendChatMessage(newMessage);
        } else if (gameMode === "ai") {
            // Añadir mensaje del usuario
            const newMessage: ChatMessage = {
                text,
                sender: playerColor,
                timestamp: Date.now(),
                isSystem: false
            }
            setMessages([...messages, newMessage]);

            // Obtener respuesta de la IA
            await sendAIMessage([...messages, newMessage]);
        }
    };

    // Auto-scroll y contador de mensajes no leídos
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        if (!isOpen || isMinimized) {
            setUnreadCount(prev => prev + 1);
        }
    }, [messages]);

    // Reset unread count cuando se abre el chat
    useEffect(() => {
        if (isOpen && !isMinimized) {
            setUnreadCount(0);
        }
    }, [isOpen, isMinimized]);

    return (
        <AnimatePresence mode="wait">
            {isOpen ? (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="z-50"
                >
                    <Card className={cn(
                        "flex flex-col shadow-lg transition-all duration-200",
                        isMinimized ? "h-[60px] w-[300px]" : "h-[500px] w-[400px]"
                    )}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-3">
                            <h3 className="font-medium flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Game Chat
                                {unreadCount > 0 && isMinimized && (
                                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8"
                                    onClick={() => setIsMinimized(!isMinimized)}
                                >
                                    {isMinimized ? 
                                        <Maximize2 className="w-4 h-4" /> : 
                                        <Minimize2 className="w-4 h-4" />
                                    }
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Chat content - solo visible cuando no está minimizado */}
                        <AnimatePresence>
                            {!isMinimized && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex-1 flex flex-col"
                                >
                                    <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                                        <div className="space-y-3">
                                            {messages.map((msg, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`flex ${
                                                        msg.sender === playerColor
                                                            ? 'justify-end'
                                                            : 'justify-start'
                                                    }`}
                                                >
                                                    <div className={cn(
                                                        "rounded-lg px-3 py-2 max-w-[80%]",
                                                        msg.isSystem
                                                            ? "bg-muted text-center w-full text-sm"
                                                            : msg.sender === playerColor
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted"
                                                    )}>
                                                        <p className="text-sm break-words">{msg.text}</p>
                                                        <span className="text-[10px] opacity-50">
                                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </ScrollArea>

                                    <div className="border-t bg-background/95"></div>
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                if (input.trim()) {
                                                    handleSendMessage(input);
                                                    setInput('');
                                                }
                                            }}
                                            className="flex gap-2 px-2"
                                        >
                                            <Input
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder="Type a message..."
                                                className="flex-1 focus:ring-0 focus:ring-offset-0 border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                                            />
                                            <button type="submit">
                                                <Send className="w-5 h-5" />
                                            </button>
                                        </form>
                                        {aiThinking && (
                                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/90 animate-pulse" />
                                                AI is thinking...
                                            </div>
                                        )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </motion.div>
            ) : (
                <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg relative"
                    onClick={() => setIsOpen(true)}
                >
                    <MessageSquare className="w-5 h-5" />
                    {messages.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            )}
        </AnimatePresence>
    );
};
