import { Component } from "react";
import styles from "./ErrorBoundary.module.css";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={styles.box} role="alert">
        <div className={styles.icon}>💥</div>
        <h2 className={styles.title}>Something went wrong</h2>
        <p className={styles.message}>
          {this.state.error?.message || "An unexpected error occurred in the UI."}
        </p>
        <button className={styles.btn} onClick={this.handleReset}>
          Try again
        </button>
      </div>
    );
  }
}