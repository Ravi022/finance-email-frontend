export default function BrandLogo({ className = '', size = 'md' }) {
  return (
    <span className={`brand-mark ${size} ${className}`.trim()}>
      <img src="/rashmi-logo.png" alt="Rashmi Group" />
    </span>
  );
}
