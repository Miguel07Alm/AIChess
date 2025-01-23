import { useState, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { MessageSquare, Send } from 'lucide-react';
import { useRTC } from '@/contexts/RTCContext';
import { useGame } from '@/contexts/GameContext';
import { ChatMessage } from '@/types/webrtc';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";

export const GameChatMobile = () => {
    const { messages, gameMode, aiThinking, sendAIMessage, setMessages } = useGame();
    const { playerColor, sendChatMessage } = useRTC();
    const [input, setInput] = useState('');
    const [open, setOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;
        
        if (gameMode === "online") {
            sendChatMessage({
                text,
                sender: playerColor,
                timestamp: Date.now(),
                isSystem: false
            });
        } else if (gameMode === "ai") {
            const newMessage: ChatMessage = {
                text,
                sender: playerColor,
                timestamp: Date.now(),
                isSystem: false
            }
            setMessages([...messages, newMessage]);
            await sendAIMessage([...messages, newMessage]);
        }
        setInput('');
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <>
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
                    >
                        <MessageSquare className="h-5 w-5" />
                        {messages.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                                {messages.length}
                            </span>
                        )}
                    </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[80vh]">
                    <DrawerHeader>
                        <DrawerTitle>Game Chat</DrawerTitle>
                    </DrawerHeader>
                    <div className="flex-1 overflow-y-auto px-4">
                        <div className="space-y-4 mb-4">
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${
                                        msg.sender === playerColor ? 'justify-end' : 'justify-start'
                                    }`}
                                >
                                    <div
                                        className={`
                                            rounded-lg px-3 py-2 max-w-[80%]
                                            ${
                                                msg.isSystem
                                                    ? 'bg-muted text-center w-full text-sm'
                                                    : msg.sender === playerColor
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted'
                                            }
                                        `}
                                    >
                                        <p className="text-sm break-words">{msg.text}</p>
                                        <span className="text-[10px] opacity-50">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                    <DrawerFooter className="pt-2">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage(input);
                            }}
                            className="flex gap-2"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1"
                            />
                            <Button type="submit" size="icon">
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                        {aiThinking && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/90 animate-pulse" />
                                AI is thinking...
                            </div>
                        )}
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </>
    );
};
