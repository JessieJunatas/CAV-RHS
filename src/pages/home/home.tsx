import HeroSection from "./hero"
import DataCard from "./data"
import cardsData from "@/hooks/data"

const Home: React.FC = () => {
  return (
    <div>
      <HeroSection />

      <div className="grid grid-cols-2 gap-5 p-6">
        {cardsData.map(card => (
          <DataCard
            key={card.id}
            id={card.id}
            title={card.title}
            value={card.value}
            description={card.description}
          />
        ))}
      </div>
    </div>
  )
}

export default Home
