"use client";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef, // Add useRef import
} from "react";
import type {
    RTCMessage,
    GameMove,
    SignalingMessage,
    APIResponse,
    RTCSessionDescriptionWithColor,
    ChatMessage,
    TimeSyncPayload,
} from "@/types/webrtc";
import { toast } from "sonner";

interface GameMessageHandlers {
    onMove?: (move: GameMove) => void;
    onGameStart?: () => void;
    onOpponentDisconnect?: () => void;
    onChatMessage?: (message: ChatMessage) => void; // Add onChatMessage to handlers
    onTimeSync?: (timeWhite: number, timeBlack: number) => void;
    onConnectionEstablished?: () => void;
}

interface RTCContextType {
    createGame: () => Promise<string>;
    joinGame: (roomId: string) => Promise<void>;
    sendMove: (move: GameMove) => void;
    isConnected: boolean;
    setIsConnected: (connected: boolean) => void;
    isHost: boolean;
    roomId: string | null;
    error: string | null;
    playerColor: "w" | "b" | null;
    clientId: string;
    setMessageHandlers: (handlers: GameMessageHandlers) => void;
    disconnect: () => void;
    expiresIn: number | null; 
    sendChatMessage: (newMessage: ChatMessage) => void; 
    isSpectator: boolean;
    sendTimeSync: (timeWhite: number, timeBlack: number) => void; // Add sendTimeSync to context type
}

const RTCContext = createContext<RTCContextType | null>(null);

export function RTCProvider({ children }: { children: React.ReactNode }) {
    // Replace useState with useRef for peerConnection
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const isHostRef = useRef(false);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [playerColor, setPlayerColor] = useState<"w" | "b" | null>(null);
    const [clientId] = useState(() =>
        Math.random().toString(36).substring(2, 9)
    );
    const [messageHandlers, setMessageHandlers] = useState<GameMessageHandlers>(
        {}
    );
    const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(
        null
    );
    const [connectionEstablished, setConnectionEstablished] = useState(false);
    const [isIceConnected, setIsIceConnected] = useState(false);
    const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
    const [expiresIn, setExpiresIn] = useState<number | null>(null); // Add expiresIn state
    const [isSpectator, setIsSpectator] = useState(false);

    // Mantener una referencia estable a los handlers
    const handlersRef = useRef<GameMessageHandlers>({});

    // Modificar setMessageHandlers para actualizar también la referencia
    const setMessageHandlersWithRef = useCallback((handlers: GameMessageHandlers) => {
        handlersRef.current = handlers;
        setMessageHandlers(handlers);
    }, []);

    const createPeerConnection = useCallback(() => {
        console.log("[RTC] Creating new peer connection");
        const pc = new RTCPeerConnection({
            iceServers: [
                // Añadir más servidores STUN/TURN para mejor conectividad
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
                { urls: "stun:stun2.l.google.com:19302" },
                { urls: "stun:stun3.l.google.com:19302" },
                { urls: "stun:stun4.l.google.com:19302" },
                // Recomendado: Añadir un servidor TURN
                // Necesitarás credenciales de un proveedor como Twilio o custom TURN
                /*
                {
                    urls: "turn:your-turn-server.com:3478",
                    username: "username",
                    credential: "password"
                }
                */
            ],
            iceCandidatePoolSize: 10
        });

        // Store in ref immediately
        peerConnectionRef.current = pc;

        pc.onicecandidate = (event) => {
            // Solo enviar si hay un candidato válido
            if (event.candidate && roomId) {
                console.log("Valid ICE Candidate:", {
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                });

                sendSignalingMessage({
                    type: "ice-candidate",
                    roomId,
                    payload: event.candidate,
                });
            } else if (!event.candidate) {
                // Fin de la recopilación de candidatos
                console.log("ICE gathering completed");
            }
        };

        pc.onicegatheringstatechange = () => {
            console.log("ICE Gathering State:", pc.iceGatheringState);
        };

        pc.oniceconnectionstatechange = () => {
            console.log("ICE Connection State:", pc.iceConnectionState);
            if (pc.iceConnectionState === "failed") {
                console.log("ICE connection failed, restarting ICE");
                pc.restartIce();
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("[RTC] Connection state changed:", pc.connectionState);
            switch (pc.connectionState) {
                case "connected":
                    console.log("[RTC] ICE Connection established");
                    setIsIceConnected(true);
                    setConnectionEstablished(true);
                    if (pollInterval) {
                        clearInterval(pollInterval);
                        setPollInterval(null);
                    }
                    break;
                case "disconnected":
                case "failed":
                    setIsConnected(false);
                    // setError("Connection lost");
                    console.log("Peer connection failed/disconnected");
                    break;
                case "closed":
                    setIsConnected(false);
                    console.log("Peer connection closed");
                    break;
            }
        };

        return pc;
    }, [roomId, pollInterval, dataChannelRef]);

    const sendSignalingMessage = async (
        message: Omit<SignalingMessage, "clientId">
    ) => {
        if (!roomId) return;

        try {
            console.log("[RTC] Preparing signaling message:", {
                type: message.type,
                roomId,
                clientId,
                payload:
                    message.type === "offer"
                        ? {
                              type: (
                                  message.payload as RTCSessionDescriptionInit
                              ).type,
                              sdpPreview: (
                                  message.payload as RTCSessionDescriptionInit
                              ).sdp?.substring(0, 50),
                          }
                        : message.payload,
            });

            const response = await fetch("/api/rtc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomId,
                    clientId,
                    message: {
                        type: message.type,
                        roomId,
                        clientId,
                        payload:
                            message.type === "offer" ||
                            message.type === "answer"
                                ? {
                                      type: (
                                          message.payload as RTCSessionDescriptionInit
                                      ).type,
                                      sdp: (
                                          message.payload as RTCSessionDescriptionInit
                                      ).sdp,
                                  }
                                : message.payload,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("[RTC] Server error:", errorData);
                throw new Error(
                    errorData.details || "Failed to send signaling message"
                );
            }

            const data: APIResponse = await response.json();
            console.log("[RTC] Server response:", data);
            return data;
        } catch (error) {
            console.error("[RTC] Send message error:", error);
            throw error;
        }
    };
    const disconnect = useCallback(() => {
        if (dataChannelRef.current?.readyState === "open") {
            // Enviar señal de desconexión antes de cerrar
            const message: RTCMessage = {
                type: "disconnect",
                payload: null,
            };
            dataChannelRef.current.send(JSON.stringify(message));
        }

        // Limpiar estado
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (dataChannelRef.current) {
            dataChannelRef.current.close();
            dataChannelRef.current = null;
        }
        setIsConnected(false);
        setRoomId(null);
        setPlayerColor(null);
        isHostRef.current = false;
        setIsIceConnected(false);
        setIsDataChannelOpen(false);
        setConnectionEstablished(false);
    }, []);
    const pollMessages = useCallback(
        async (roomId: string) => {
            try {
                const response = await fetch(
                    `/api/rtc?roomId=${roomId}&clientId=${clientId}`,
                    {
                        headers: {
                            Accept: "application/json",
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: APIResponse = await response.json();

                if (data.error) {
                    console.warn("[RTC] Polling warning:", data.error);
                    return;
                }

                // Enhanced logging
                console.log("[RTC] Polling received messages:", {
                    count: data.messages?.length,
                    messages: data.messages?.map((m) => ({
                        type: m.type,
                        from: m.clientId,
                        sdp: m.type === "answer" ? "SDP_PRESENT" : undefined,
                        isValid:
                            m.type === "answer"
                                ? !!(
                                      m.payload &&
                                      (m.payload as RTCSessionDescriptionInit)
                                          .sdp
                                  )
                                : true,
                    })),
                });
                console.log("🚀 ~ peerConnection:", peerConnectionRef.current);

                if (!peerConnectionRef.current) {
                    console.warn("[RTC] No peer connection available");
                    return;
                }
                console.log(
                    "🚀 ~ pollMessages ~ data.messages:",
                    data.messages
                );
                const isHost = isHostRef.current;

                // Process messages in strict order
                for (const message of data.messages || []) {
                    try {
                        if (message.type === "answer") {
                            console.log("🚀 ~ pollMessages ~ isHost:", isHost);

                            if (!isHost) continue;
                            const sdp = (
                                message.payload as RTCSessionDescriptionInit
                            )?.sdp;
                            if (!sdp) {
                                console.error(
                                    "[RTC] Invalid answer SDP:",
                                    message.payload
                                );
                                continue;
                            }

                            console.log("[RTC] Processing answer:", {
                                from: message.clientId,
                                sdpPreview: sdp.substring(0, 50) + "...",
                            });

                            const desc = new RTCSessionDescription({
                                type: "answer",
                                sdp: sdp,
                            });

                            await peerConnectionRef.current.setRemoteDescription(
                                desc
                            );
                            console.log(
                                "[RTC] Remote description set successfully"
                            );

                            setConnectionEstablished(true);
                            setIsConnected(true);
                        } else if (message.type === "ice-candidate") {
                            if (!message.payload) {
                                console.error(
                                    "[RTC] Invalid ICE candidate:",
                                    message.payload
                                );
                                continue;
                            }

                            console.log(
                                "[RTC] Adding ICE candidate:",
                                message.payload
                            );
                            await peerConnectionRef.current.addIceCandidate(
                                new RTCIceCandidate(
                                    message.payload as RTCIceCandidateInit
                                )
                            );
                        }
                    } catch (err) {
                        console.error("[RTC] Failed to process message:", {
                            type: message.type,
                            error: err,
                        });
                    }
                }

                if (data.expiresIn) {
                    setExpiresIn(data.expiresIn);

                    // Si quedan menos de 60 segundos, mostrar advertencia
                    if (data.expiresIn < 60) {
                        toast.warning(
                            `Room expires in ${data.expiresIn} seconds!`,
                            {
                                duration: 5000,
                            }
                        );
                    }

                    // Si la sala ha expirado, desconectar
                    if (data.expiresIn <= 0) {
                        toast.error("Room has expired");
                        disconnect();
                        return;
                    }
                }

                // Verificar si somos espectador (ni host ni segundo jugador)
                if (data.clients && data.clients.length > 2) {
                    const isThirdOrLater = data.clients.indexOf(clientId) >= 2;
                    if (isThirdOrLater) {
                        setIsSpectator(true);
                        setPlayerColor(null);
                    }
                }
            } catch (error) {
                console.error("[RTC] Polling error:", error);
            }
        },
        [clientId, isHostRef, disconnect] // Remove peerConnection from dependencies
    );

    const createGame = async () => {
        try {
            // Primero establecer isHost
            isHostRef.current = true;

            console.log("[RTC] Creating new game as host...");
            setIsIceConnected(false);
            setIsDataChannelOpen(false);

            // Create and store peer connection
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;

            // Generate room ID and set color first
            const newRoomId = Math.random().toString(36).substring(2, 8);
            const hostColor = Math.random() < 0.5 ? "w" : "b";
            setRoomId(newRoomId);
            setPlayerColor(hostColor);

            // Create data channel después de que isHost sea true
            const channel = pc.createDataChannel("game", {
                ordered: true,
                maxRetransmits: 0,
                protocol: "json",
            });

            console.log("[RTC] Data channel created:", {
                label: channel.label,
                state: channel.readyState,
                isHost: true, // Ahora esto será correcto
                color: hostColor,
                peerConnection: !!pc,
            });

            // Setup channel before proceeding
            dataChannelRef.current = channel;
            setupDataChannel(channel);

            // Primero crear la sala
            const createResponse = await fetch("/api/rtc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomId: newRoomId,
                    clientId,
                    message: {
                        type: "create",
                        roomId: newRoomId,
                        clientId,
                        payload: null,
                    },
                }),
            });

            if (!createResponse.ok) {
                throw new Error("Failed to create room in server");
            }

            // Crear y enviar la oferta
            console.log("[RTC] Creating offer...");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Esperar a que se recopilen los candidatos ICE
            await new Promise((resolve) => setTimeout(resolve, 2000));

            if (!pc.localDescription) {
                throw new Error("No local description available");
            }

            const offerPayload: RTCSessionDescriptionWithColor = {
                type: pc.localDescription.type as RTCSdpType,
                sdp: pc.localDescription.sdp,
                hostColor, // Incluir el color del host en la oferta
            };

            console.log("[RTC] Sending offer with host color:", hostColor);
            const offerResponse = await fetch("/api/rtc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomId: newRoomId,
                    clientId,
                    message: {
                        type: "offer",
                        roomId: newRoomId,
                        clientId,
                        payload: offerPayload,
                    },
                }),
            });

            if (!offerResponse.ok) {
                const errorData = await offerResponse.json();
                throw new Error(errorData.details || "Failed to store offer");
            }

            const offerResult = await offerResponse.json();
            console.log("[RTC] Offer stored:", offerResult);

            // Verificar almacenamiento con retraso y header especial
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const verifyResponse = await fetch(
                `/api/rtc?roomId=${newRoomId}&clientId=${clientId}`,
                {
                    headers: {
                        "x-verify-offer": "true",
                        Accept: "application/json",
                    },
                }
            );

            const verifyData: APIResponse = await verifyResponse.json();
            console.log("[RTC] Verify response:", {
                messageCount: verifyData.messages?.length,
                messageTypes: verifyData.messages?.map((m) => m.type),
                offerFound: verifyData.messages?.some(
                    (m) => m.type === "offer"
                ),
            });

            if (
                !verifyData.messages?.some(
                    (m) => m.type === "offer" && m.clientId === clientId
                )
            ) {
                throw new Error("Offer verification failed");
            }

            console.log("[RTC] Starting polling for answers...");
            const interval = setInterval(async () => {
                if (!isConnected && peerConnectionRef.current) {
                    // Check for pc explicitly
                    try {
                        await pollMessages(newRoomId);
                    } catch (err) {
                        console.error("[RTC] Polling error:", err);
                    }
                } else {
                    clearInterval(interval);
                    setPollInterval(null);
                }
            }, 1000);

            setPollInterval(interval);
            return newRoomId;
        } catch (error) {
            isHostRef.current = false;
            setIsIceConnected(false);
            setIsDataChannelOpen(false);
            peerConnectionRef.current = null;
            console.error("[RTC] Create game error:", error);
            throw error;
        }
    };

    const joinGame = async (gameRoomId: string) => {
        try {
            console.log("[RTC] Joining game as guest...");
            isHostRef.current = false;
            const pc = createPeerConnection();

            // Set up ondatachannel handler before setting remote description
            pc.ondatachannel = (event) => {
                console.log("[RTC] Received data channel as guest:", {
                    label: event.channel.label,
                    state: event.channel.readyState,
                    isHost: false,
                });
                const channel = event.channel;
                dataChannelRef.current = channel;
                setupDataChannel(channel);
            };

            setRoomId(gameRoomId); // Move this up before creating answer

            // Esperar y obtener la oferta
            let offerMessage = null;
            let retries = 0;
            const maxRetries = 10; // Aumentar el número de intentos
            const retryDelay = 1000;
            let data: APIResponse | null = null;

            while (!offerMessage && retries < maxRetries) {
                console.log(
                    `[RTC] Checking for offer (attempt ${
                        retries + 1
                    }/${maxRetries})...`
                );
                const response = await fetch(
                    `/api/rtc?roomId=${gameRoomId}&clientId=${clientId}`
                );
                data = await response.json();
                if (!data) {
                    throw new Error("No response from server");
                }

                console.log("[RTC] Room check response:", data);

                offerMessage = data.messages.find((m) => m.type === "offer");
                if (!offerMessage) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, retryDelay)
                    );
                    retries++;
                }
            }

            if (!offerMessage) {
                throw new Error("No offer found after retries");
            }
            if (!data) {
                throw new Error("No data found after retries");
            }

            setRoomId(gameRoomId);

            // Extraer el color del host de la oferta y asignar el opuesto
            const payload =
                offerMessage.payload as RTCSessionDescriptionWithColor;
            const hostColor = payload.hostColor;

            if (!hostColor) {
                throw new Error("Missing host color in offer");
            }

            const guestColor = hostColor === "w" ? "b" : "w";
            console.log(
                "[RTC] Guest color assigned:",
                guestColor,
                "(host was:",
                hostColor,
                ")"
            );
            setPlayerColor(guestColor);

            console.log(
                "[RTC] Setting remote description with offer:",
                offerMessage
            );
            await pc.setRemoteDescription(
                new RTCSessionDescription(
                    offerMessage.payload as RTCSessionDescriptionInit
                )
            );

            console.log("[RTC] Creating and sending answer...");
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Wait for ICE gathering to complete
            await new Promise<void>((resolve) => {
                const checkState = () => {
                    if (pc.iceGatheringState === "complete") {
                        resolve();
                    } else {
                        pc.onicegatheringstatechange = () => {
                            if (pc.iceGatheringState === "complete") {
                                resolve();
                            }
                        };
                    }
                };
                checkState();
            });

            // Send answer with complete SDP
            console.log(
                "[RTC] Sending answer for room:",
                gameRoomId,
                "SDP:",
                pc.localDescription?.sdp?.substring(0, 100)
            );

            const answerResult = await fetch("/api/rtc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomId: gameRoomId,
                    clientId,
                    message: {
                        type: "answer",
                        roomId: gameRoomId,
                        clientId,
                        payload: pc.localDescription,
                    },
                }),
            });

            if (!answerResult.ok) {
                throw new Error("Failed to send answer");
            }

            const resultData = await answerResult.json();
            console.log("[RTC] Answer sent result:", resultData);

            // Start polling with enhanced error handling
            const pollWithRetries = async (retryCount = 0, maxRetries = 5) => {
                if (!isConnected && retryCount < maxRetries) {
                    try {
                        await pollMessages(gameRoomId);
                        setTimeout(() => pollWithRetries(0, maxRetries), 1000); // Reset retries on success
                    } catch (err) {
                        console.error("[RTC] Polling error:", err);
                        setTimeout(
                            () => pollWithRetries(retryCount + 1, maxRetries),
                            1000
                        );
                    }
                }
            };

            pollWithRetries();
            console.log("[RTC] Connection established after join");
        } catch (error) {
            isHostRef.current = false;
            console.error("[RTC] Join game error:", error);
            throw error;
        }
    };

    // Modificar el handleGameMessage para usar la referencia de handlers
    const handleGameMessage = useCallback((message: RTCMessage) => {
        console.log("[RTC] Received game message:", {
            type: message.type,
            payload: message.payload,
            hasHandlers: Object.keys(handlersRef.current).length > 0
        });

        const handlers = handlersRef.current;

        switch (message.type) {
            case "disconnect":
                if (handlers.onOpponentDisconnect) {
                    handlers.onOpponentDisconnect();
                }
                disconnect(); // Llamar a disconnect después del handler
                break;
            case "move":
                if (handlers.onMove && message.payload && "from" in message.payload && "to" in message.payload) {
                    handlers.onMove(message.payload);
                }
                break;
            case "game-start":
                if (handlers.onGameStart) {
                    handlers.onGameStart();
                }
                break;
            case "chat":
                if (handlers.onChatMessage) {
                    handlers.onChatMessage(message.payload as ChatMessage);
                }
                break;
            case "time-sync":
                if (handlers.onTimeSync && message.payload) {
                    const { timeWhite, timeBlack } = message.payload as TimeSyncPayload;
                    handlers.onTimeSync(timeWhite, timeBlack);
                }
                break;
            case "connection-established":
                if (handlers.onConnectionEstablished) {
                    handlers.onConnectionEstablished();
                }
                break;
            default:
                console.warn("[RTC] Unhandled message type:", message.type);
        }
    }, [disconnect]); // Solo depende de disconnect

    // Modificar setupDataChannel para asegurar que el juego inicie correctamente
    const setupDataChannel = useCallback(
        (channel: RTCDataChannel) => {
            const isHost = isHostRef.current;

            // Configure channel first
            channel.binaryType = "arraybuffer";

            console.log("[RTC] Setting up data channel:", {
                label: channel.label,
                state: channel.readyState,
                isHost,
                playerColor,
                isIceConnected,
            });

            channel.onopen = () => {
                console.log("[RTC] Data channel opened:", {
                    label: channel.label,
                    id: channel.id,
                    state: channel.readyState,
                    isHost,
                    playerColor,
                    isIceConnected,
                });

                setIsDataChannelOpen(true);
                setIsConnected(true);

                if (isHost) {
                    // Enviar game-start inmediatamente
                    setTimeout(() => {
                        if (channel.readyState === "open") {
                            if (!playerColor) {
                                console.warn("[RTC] No player color available");
                                return;
                            }
                            const startMessage: RTCMessage = {
                                type: "game-start",
                                payload: { hostColor: playerColor },
                            };
                            channel.send(JSON.stringify(startMessage));
                            // Activar el handler para ambos jugadores
                            if (messageHandlers.onGameStart) {
                                messageHandlers.onGameStart();
                            }
                        }
                    }, 1000);
                } else {
                    // Si es guest, enviar tiempo inicial al host
                    if (!isHost && playerColor) {
                        setTimeout(() => {
                            sendTimeSync(600, 600); // Enviar tiempos iniciales
                        }, 1000);
                    }
                }
            };

            channel.onclose = () => {
                console.log("[RTC] Data channel closed");
                setIsConnected(false);
            };

            channel.onerror = (error) => {
                console.error("[RTC] Data channel error:", error);
                // setError("Connection error occurred");
            };

            channel.onmessage = (event) => {
                try {
                    console.log("[RTC] Received message:", event.data);
                    const message = JSON.parse(event.data) as RTCMessage;
                    handleGameMessage(message);
                } catch (err) {
                    console.error("[RTC] Message handling error:", err);
                }
            };
        },
        [isHostRef, playerColor, messageHandlers]
    );

    const sendMove = useCallback(
        (move: GameMove) => {
            const dataChannel = dataChannelRef.current;
            const isHost = isHostRef.current;

            console.log("[RTC] Attempting to send move:", {
                move,
                channelState: dataChannel?.readyState,
                isConnected,
                isHost,
                playerColor,
            });

            if (dataChannel?.readyState === "open") {
                try {
                    const message: RTCMessage = {
                        type: "move",
                        payload: move,
                    };
                    const messageStr = JSON.stringify(message);
                    dataChannel.send(messageStr);
                    console.log("[RTC] Move sent successfully:", {
                        move,
                        messageLength: messageStr.length,
                    });
                } catch (err) {
                    console.error("[RTC] Error sending move:", err);
                    throw err;
                }
            } else {
                console.warn("[RTC] Cannot send move - channel not ready:", {
                    readyState: dataChannel?.readyState,
                    isConnected,
                    dataChannelExists: !!dataChannel,
                });
                throw new Error("Data channel not ready");
            }
        },
        [isHostRef, playerColor]
    );

    const sendChatMessage = useCallback((newMessage: ChatMessage) => {
        const dataChannel = dataChannelRef.current;
        if (dataChannel?.readyState === "open") {
            const message: RTCMessage = {
                type: "chat",
                payload: { ...newMessage },
            };
            dataChannel.send(JSON.stringify(message));
        }
        
    }, [playerColor]);

    // Añadir método para sincronizar tiempos
    const sendTimeSync = useCallback((timeWhite: number, timeBlack: number) => {
        const dataChannel = dataChannelRef.current;
        if (dataChannel?.readyState === "open") {
            const message: RTCMessage = {
                type: "time-sync",
                payload: { timeWhite, timeBlack },
            };
            dataChannel.send(JSON.stringify(message));
        }
    }, []);

    // Add connection monitoring
    useEffect(() => {
        if (peerConnectionRef.current) {
            const handleConnectionChange = () => {
                console.log(
                    "[RTC] Connection state changed:",
                    peerConnectionRef.current?.connectionState
                );
                if (!peerConnectionRef.current?.connectionState) {
                    console.warn("[RTC] No connection state available");
                    return;
                }
                if (
                    peerConnectionRef.current?.connectionState === "connected"
                ) {
                    setIsConnected(true);
                    // Clear polling interval when connected
                    if (pollInterval) {
                        clearInterval(pollInterval);
                        setPollInterval(null);
                    }
                } else if (
                    ["disconnected", "failed", "closed"].includes(
                        peerConnectionRef.current?.connectionState
                    )
                ) {
                    setIsConnected(false);
                }
            };

            peerConnectionRef.current.onconnectionstatechange =
                handleConnectionChange;

            return () => {
                if (peerConnectionRef.current) {
                    peerConnectionRef.current.onconnectionstatechange = null;
                }
            };
        }
    }, [pollInterval]);

    // Add a new effect to monitor connection establishment
    useEffect(() => {
        const isHost = isHostRef.current;
        const dataChannel = dataChannelRef.current;
        if (peerConnectionRef.current && dataChannel) {
            console.log("[RTC] Connection status:", {
                peerState: peerConnectionRef.current.connectionState,
                channelState: dataChannel.readyState,
                isHost,
                playerColor,
            });
            
        }
    }, [dataChannelRef, isHostRef, playerColor]);

    useEffect(() => {
        const dataChannel = dataChannelRef.current;
        const isHost = isHostRef.current;
        if (
            peerConnectionRef.current?.connectionState === "connected" &&
            dataChannel?.readyState === "open"
        ) {
            console.log("[RTC] Both connection and channel are ready:", {
                isHost,
                playerColor,
                connectionEstablished,
            });
        }
    }, [dataChannelRef, isHostRef, playerColor, connectionEstablished]);

    useEffect(() => {
        const dataChannel = dataChannelRef.current;
        const isHost = isHostRef.current;

        if (isIceConnected && isDataChannelOpen) {
            console.log("[RTC] Full connection established:", {
                isHost,
                playerColor,
                dataChannelState: dataChannel?.readyState,
                peerState: peerConnectionRef.current?.connectionState,
            });

            // Enviar señal de conexión establecida
            if (dataChannel?.readyState === "open") {
                const message: RTCMessage = {
                    type: "connection-established",
                    payload: null,
                };
                dataChannel.send(JSON.stringify(message));
                if (messageHandlers.onConnectionEstablished) {
                    messageHandlers.onConnectionEstablished();
                }
            }
        }
    }, [
        isIceConnected,
        isDataChannelOpen,
        isHostRef,
        playerColor,
        dataChannelRef,
    ]);

    // Añadir efecto para manejar la desconexión automática
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isConnected) {
                disconnect();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup cuando el componente se desmonte
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (isConnected) {
                disconnect();
            }
        };
    }, [isConnected, disconnect]);

    return (
        <RTCContext.Provider
            value={{
                createGame,
                joinGame,
                sendMove,
                isConnected,
                setIsConnected,
                isHost: isHostRef.current,
                roomId,
                error,
                playerColor,
                clientId,
                setMessageHandlers: setMessageHandlersWithRef,
                disconnect,
                expiresIn, // Add expiresIn to context value
                sendChatMessage, // Add sendChatMessage to context value
                isSpectator,
                sendTimeSync, // Add sendTimeSync to context value
            }}
        >
            {children}
        </RTCContext.Provider>
    );
}

export const useRTC = (): RTCContextType => {
    const context = useContext(RTCContext);
    if (!context) throw new Error("useRTC must be used within RTCProvider");
    return context;
};
