import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error?: Error
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Cadentra render failure', { error, componentStack: info.componentStack })
  }

  private retry = () => {
    this.setState({ error: undefined })
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="error-screen" role="alert">
        <div className="brand error-brand"><span className="brand-mark">C</span><span>Cadentra</span></div>
        <p className="eyebrow">เกิดข้อผิดพลาดที่กู้คืนได้</p>
        <h1>เปิดพื้นที่ทำงานไม่สำเร็จ</h1>
        <p>ข้อมูลของคุณยังอยู่ ลองโหลดแอปใหม่อีกครั้ง หากปัญหายังเกิดขึ้นให้ตรวจการตั้งค่า environment</p>
        <button className="primary" type="button" onClick={this.retry}>โหลดใหม่</button>
        {import.meta.env.DEV && <pre>{this.state.error.message}</pre>}
      </main>
    )
  }
}
