import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', this.props.label, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 rounded-2xl border border-down/40 bg-down/10 p-5 text-txt">
          <div className="mb-2 text-[14px] font-bold text-down">页面渲染出错：{this.props.label}</div>
          <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-txt-dim">
            {this.state.error?.message ?? '未知错误'}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 rounded-lg bg-accent-grad px-3 py-1.5 text-[12px] font-bold text-ink-900"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
