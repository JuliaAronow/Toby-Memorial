import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { MagicCard } from '@/components/ui/magic-card';
import { ConfettiButton } from '@/components/ui/confetti';

const randomImagesofShit = [
  'src/assets/1.gif',
  'src/assets/2.gif',
  'src/assets/3.gif',
  'src/assets/4.png',
  'src/assets/5.jpg',
  'src/assets/6.png',
  'src/assets/7.jpg',
  'src/assets/8.gif',
  'src/assets/9.jpg',
  'src/assets/10.jpg',
  'src/assets/11.jpg',
  'src/assets/12.jpg',
];

function App() {
  return (
    <div className="p-16 m-auto gap-4">
      <Carousel
        opts={{
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-1">
          {randomImagesofShit.map((shitImage, index) => (
            <CarouselItem className="-1 md:basis-1/2 lg:basis-1/3" key={index}>
              <div className="p-1">
                <MagicCard
                  className="cursor-pointer flex-col items-center justify-center whitespace-nowrap text-4xl shadow-2xl"
                  gradientColor="#D9D9D955"
                >
                  <span className="text-4xl font-semibold">
                    <img src={shitImage} alt="Random Image" className="w-full max-w-xs" />
                  </span>
                </MagicCard>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <ConfettiButton>Funny Image</ConfettiButton>
    </div>
  );
}

export default App;
