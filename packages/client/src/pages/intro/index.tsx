import { Hero } from './sections/Hero'
import { Architecture } from './sections/Architecture'
import { CoreComponents } from './sections/CoreComponents'
import { TechStack } from './sections/TechStack'
import { ProblemSolutions } from './sections/ProblemSolutions'
import { CallToAction } from './sections/CallToAction'

export default function IntroPage() {
  return (
    <>
      <Hero />
      <Architecture />
      <CoreComponents />
      <ProblemSolutions />
      <TechStack />
      <CallToAction />
    </>
  )
}
