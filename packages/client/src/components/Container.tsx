import type { CSSProperties, PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  className?: string
  style?: CSSProperties
}>

/** Centered max-width content frame, consistent gutters. */
export function Container({ className, style, children }: Props) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        maxWidth: 'var(--container)',
        marginInline: 'auto',
        paddingInline: 'var(--space-5)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
