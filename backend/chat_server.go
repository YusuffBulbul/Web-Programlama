// Chat server implementation with broadcaster logic
package main

import (
	"context"
	"sync"
	"time"

	pb "github.com/yusuf/grpc-chat-demo/proto"
)

type Broadcaster struct {
	mu      sync.Mutex
	clients map[string]chan *pb.Mesaj
}

type ChatServer struct {
	pb.UnimplementedChatServisServer
	broadcaster *Broadcaster
}

func NewChatServer() *ChatServer {
	return &ChatServer{
		broadcaster: &Broadcaster{
			clients: make(map[string]chan *pb.Mesaj),
		},
	}
}

func (b *Broadcaster) Register(clientID string) chan *pb.Mesaj {
	b.mu.Lock()
	defer b.mu.Unlock()
	ch := make(chan *pb.Mesaj, 10)
	b.clients[clientID] = ch
	return ch
}

func (b *Broadcaster) Unregister(clientID string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if ch, ok := b.clients[clientID]; ok {
		close(ch)
		delete(b.clients, clientID)
	}
}

func (b *Broadcaster) Broadcast(msg *pb.Mesaj) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, ch := range b.clients {
		select {
		case ch <- msg:
		default:
		}
	}
}

func (s *ChatServer) MesajGonder(ctx context.Context, req *pb.MesajGonderIstek) (*pb.MesajGonderYanit, error) {
	msg := req.Mesaj
	msg.Zaman = time.Now().Unix()
	s.broadcaster.Broadcast(msg)
	return &pb.MesajGonderYanit{Basarili: true}, nil
}

func (s *ChatServer) SohbetiDinle(req *pb.SohbetiDinleIstek, stream pb.ChatServis_SohbetiDinleServer) error {
	clientID := req.OdaId + time.Now().String()
	ch := s.broadcaster.Register(clientID)
	defer s.broadcaster.Unregister(clientID)
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return nil
			}
			if err := stream.Send(msg); err != nil {
				return err
			}
		case <-stream.Context().Done():
			return nil
		}
	}
}

func (s *ChatServer) YaziyorDurumuGuncelle(ctx context.Context, req *pb.YaziyorDurumuIstek) (*pb.YaziyorDurumuYanit, error) {
	// İsteğe bağlı: Yazıyor durumu için broadcast yapılabilir
	return &pb.YaziyorDurumuYanit{Basarili: true}, nil
}
