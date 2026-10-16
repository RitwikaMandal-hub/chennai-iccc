// Hash routing works on GitHub Pages without server rewrites:
//   #/simulation?scenario=fire
export function navigate(page, params = {}) {
  const query = new URLSearchParams(params).toString();
  window.location.hash = `/${page}${query ? `?${query}` : ""}`;
}

export function readRoute(validPages) {
  const [path, query = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  const page = validPages.includes(path) ? path : "dashboard";
  return { page, params: Object.fromEntries(new URLSearchParams(query)) };
}
