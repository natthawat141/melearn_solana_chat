export default function PublicLoading() {
  return (
    <main id="main-content" className="m-page-loading" aria-busy="true">
      <span className="sr-only">Loading / กำลังโหลด</span>
      <div className="m-container m-loading-grid" aria-hidden="true">
        <div><div className="m-loading-line m-loading-title" /><div className="m-loading-line m-loading-title m-loading-short" /><div className="m-loading-line" /><div className="m-loading-line m-loading-short" /></div>
        <div className="m-loading-scene" />
      </div>
    </main>
  );
}
