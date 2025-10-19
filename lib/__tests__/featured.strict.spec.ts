import { getFeaturedTools } from "@/lib/featured";

describe("getFeaturedTools (STRICT featured)", () => {
  const base = [
    { slug: "a", flags: { featured: true }, official_video: { youtube: "https://youtu.be/dQw4w9WgXcQ" }, weight: 5 },
    { slug: "b", flags: { featured: false }, official_video: { url: "https://www.youtube.com/watch?v=xyz" }, weight: 10 },
    { slug: "c" }, // not featured
    { slug: "d", featured: true }, // legacy top-level "featured"
    { slug: "e", flags: { featured: true }, official_video: "https://www.youtube.com/watch?v=abc" }
  ];

  it("returns only tools with featured === true", () => {
    const out = getFeaturedTools(base as any, 10);
    const slugs = out.map(x => x.slug);
    expect(slugs).toEqual(expect.arrayContaining(["a", "d", "e"]));
    expect(slugs).not.toEqual(expect.arrayContaining(["b", "c"]));
  });

  it("attaches __videoId only when resolvable", () => {
    const out = getFeaturedTools(base as any, 10);
    const map: Record<string, string | undefined> = Object.fromEntries(out.map(x => [x.slug, (x as any).__videoId]));
    expect(map["a"]).toBe("dQw4w9WgXcQ");
    expect(map["e"]).toBe("abc");
    expect(map["d"]).toBeUndefined(); // featured but no video is allowed
  });

  it("sorts by weight desc, then slug asc", () => {
    const out = getFeaturedTools(base as any, 10);
    const slugs = out.map(x => x.slug);
    expect(slugs[0]).toBe("a"); // weight 5 beats weight 0
    const idxD = slugs.indexOf("d");
    const idxE = slugs.indexOf("e");
    expect(idxD).toBeLessThan(idxE); // both 0 weight -> slug asc
  });
});
