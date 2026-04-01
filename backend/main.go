package main

import (
	"log"
	"net"
	"net/http"

	pb "github.com/yusuf/grpc-chat-demo/proto"
	grpcweb "github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/rs/cors"
	"google.golang.org/grpc"
)

func main() {
	// gRPC sunucusu (HTTP/2, port 50051)
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	grpcServer := grpc.NewServer()
	pb.RegisterChatServisServer(grpcServer, NewChatServer())
	go func() {
		log.Println("gRPC server listening on :50051")
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("failed to serve grpc: %v", err)
		}
	}()

	// gRPC-Web proxy (HTTP/1.1, port 8080) — tarayıcı buraya bağlanır
	wrappedGrpc := grpcweb.WrapServer(grpcServer,
		grpcweb.WithOriginFunc(func(origin string) bool { return true }),
	)

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"grpc-status", "grpc-message", "grpc-encoding", "grpc-accept-encoding"},
		AllowCredentials: false,
	})

	httpServer := &http.Server{
		Addr: ":8080",
		Handler: corsHandler.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			wrappedGrpc.ServeHTTP(w, r)
		})),
	}

	log.Println("gRPC-Web server listening on :8080")
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("failed to serve http: %v", err)
	}
}
