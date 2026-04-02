package main

import (
	"log"
	"net/http"

	grpcweb "github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/rs/cors"
	pb "github.com/yusuf/grpc-chat-demo/proto"
	"google.golang.org/grpc"
)

// Browser gRPC backend'e dogrudan klasik gRPC ile baglanamaz
// Burada Envoy proxy yerine Go tarafindaki
// grpcweb kutuphanesinin sagladigi wrapper mekanizmasini kullaniyoruz.

func main() {
	
	grpcServer := grpc.NewServer() // Uygulamanın kullanacagi ana gRPC sunucusu
	pb.RegisterChatServisServer(grpcServer, NewChatServer()) // Proto'da tanımlı ChatServis implementasyonu

	// Ayrıca ayrı bir proxy süreci çalıştırmadan, gRPC-Web çevirisini uygulama içinde yaparız.
	// Tarayıcıdan gelen gRPC-Web isteklerini gRPC sunucusuna yönlendirmek için sarmalayıcı
	wrappedGrpc := grpcweb.WrapServer(grpcServer,
		grpcweb.WithOriginFunc(func(origin string) bool { return true }),
	)

	// Browser'dan gelen cross-origin isteklerin engellenmemesi için CORS kuralları tanımlanır.
	corsHandler := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
		ExposedHeaders:   []string{"grpc-status", "grpc-message", "grpc-encoding", "grpc-accept-encoding"},
		AllowCredentials: false,
	})

	// HTTP sunucusu browser'dan gelen isteği önce CORS katmanından,
	// sonra gRPC-Web wrapper'indan geçirerek servis metodlarına iletir.
	httpServer := &http.Server{
		Addr: ":8080",
		Handler: corsHandler.Handler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			wrappedGrpc.ServeHTTP(w, r)
		})),
	}

	// Frontend bu porta bağlanarak chat servisine erişir.
	log.Println("gRPC-Web server listening on :8080")
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("failed to serve http: %v", err)
	}
}
