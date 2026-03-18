import React, { useState, useEffect } from 'react';
import { db } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from './Button';
import { Input } from './Input';

interface Message {
    id: string;
    text: string;
    senderId: string;
    timestamp: any;
}

interface ChatProps {
    rideId: string;
    userId: string;
}

export const Chat: React.FC<ChatProps> = ({ rideId, userId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
          if (!rideId) return;

                  const q = query(
                          collection(db, 'messages'),
                          where('rideId', '==', rideId),
                          orderBy('timestamp', 'asc')
                        );

                  const unsubscribe = onSnapshot(q, (snapshot) => {
                          const msgs = snapshot.docs.map(doc => ({
                                    id: doc.id,
                                    ...doc.data()
                          })) as Message[];
                          setMessages(msgs);
                  });

                  return () => unsubscribe();
    }, [rideId]);

    const handleSendMessage = async () => {
          if (!newMessage.trim()) return;

          await addDoc(collection(db, 'messages'), {
                  rideId,
                  senderId: userId,
                  text: newMessage,
                  timestamp: serverTimestamp()
          });

          setNewMessage('');
    };

    return (
          <div className="flex flex-col h-64 bg-white border rounded-lg shadow-sm">
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messages.map((msg) => (
                      <div
                                    key={msg.id}
                                    className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}
                                  >
                                  <div
                                                  className={`max-w-[80%] rounded-lg px-3 py-1.5 ${
                                                                    msg.senderId === userId
                                                                      ? 'bg-blue-600 text-white'
                                                                      : 'bg-gray-100 text-gray-800'
                                                  }`}
                                                >
                                    {msg.text}
                                  </div>div>
                      </div>div>
                    ))}
                </div>div>
                <div className="p-4 border-t flex gap-2">
                        <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                  />
                        <Button onClick={handleSendMessage}>Send</Button>Button>
                </div>div>
          </div>div>
        );
};
</div>
