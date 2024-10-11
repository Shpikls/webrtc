import {useEffect, useRef} from "react";
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

function App() {
    const localAudioRef = useRef(null);
    const peerConnection = useRef(new RTCPeerConnection());
    const audioConstraints = { audio: true };

    useEffect(() => {
        peerConnection.current.ontrack = (event) => {
            const remoteAudio = document.createElement('audio');
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play();
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate);
            }
        };

        socket.on('offer', async (offer) => {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit('answer', answer);
        });

        socket.on('answer', async (answer) => {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('ice-candidate', (candidate) => {
            peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        });

        return () => {
            // Очистка при размонтировании компонента
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
        };
    }, []);

    const startChat = async () => {
        const localStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        localAudioRef.current.srcObject = localStream;

        localStream.getTracks().forEach(track => peerConnection.current.addTrack(track, localStream));

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.emit('offer', offer);
    };

    return (
        <div>
            <h1>WebRTC Voice Chat</h1>
            <button onClick={startChat}>Start Chat</button>
            <audio ref={localAudioRef} autoPlay muted controls />
        </div>
    );
}

export default App
