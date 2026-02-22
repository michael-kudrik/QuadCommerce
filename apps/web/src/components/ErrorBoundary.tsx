import { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="card" role="alert" style={{ marginTop: 12 }}>
          <h2>Something went wrong</h2>
          <p className="meta">The page hit an unexpected error. Please refresh and try again.</p>
        </section>
      );
    }

    return this.props.children;
  }
}
