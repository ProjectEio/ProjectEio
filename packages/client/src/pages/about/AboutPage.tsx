/* 关于页：原介绍页内容，按白底主题做最小适配（去除深色专用背景）。 */
import IntroPage from '@/pages/intro'
import styles from './AboutPage.module.css'

export default function AboutPage() {
  return (
    <div className={styles.wrap}>
      <IntroPage />
    </div>
  )
}
