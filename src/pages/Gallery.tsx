import { Hero } from "@/components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import galleryData from "../../data/gallery.json";
import padelHero from "@/assets/padel-hero.jpg";

const Gallery = () => {
  return (
    <div className="min-h-screen">
      <Hero
        title="Photo Gallery"
        subtitle="Memories from our events"
        backgroundImage={padelHero}
        compact
      />

      <section className="container mx-auto px-4 py-12">
        {/* Google Photos Albums */}
        {galleryData.albums.length > 0 && (
          <>
            <h2 className="text-3xl font-bold text-center mb-12">Event Albums</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-16">
              {galleryData.albums.map((album, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{album.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a
                      href={album.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Album →
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Image Grid */}
        <h2 className="text-3xl font-bold text-center mb-12">Highlights</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryData.images.map((image, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-lg shadow-card hover:shadow-lg transition-shadow"
            >
              <img
                src={image.src}
                alt={image.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <p className="text-white text-sm font-medium">{image.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Gallery;
