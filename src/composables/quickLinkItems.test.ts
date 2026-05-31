import { describe, expect, it } from "vitest";
import { moveQuickLinkOutOfFolder, reorderQuickLinkFolderLinks } from "./quickLinkItems";
import type { QuickLinkItem } from "./quickLinkItems";

const links = [
  { id: "alpha", type: "link", name: "Alpha", url: "https://alpha.example/" },
  { id: "bravo", type: "link", name: "Bravo", url: "https://bravo.example/" },
  { id: "charlie", type: "link", name: "Charlie", url: "https://charlie.example/" },
] as const;

describe("reorderQuickLinkFolderLinks", () => {
  it("reorders links inside one folder without changing top-level order", () => {
    const items: QuickLinkItem[] = [
      {
        id: "folder",
        type: "folder",
        name: "Folder",
        links: links.map((link) => ({ ...link })),
      },
      { id: "delta", type: "link", name: "Delta", url: "https://delta.example/" },
    ];

    const reordered = reorderQuickLinkFolderLinks(items, "folder", "alpha", 2);

    expect(reordered).not.toBe(items);
    expect(reordered.map((item) => item.id)).toEqual(["folder", "delta"]);
    expect(reordered[0]?.type).toBe("folder");
    expect(
      reordered[0]?.type === "folder" ? reordered[0].links.map((link) => link.id) : [],
    ).toEqual(["bravo", "charlie", "alpha"]);
    expect(items[0]?.type === "folder" ? items[0].links.map((link) => link.id) : []).toEqual([
      "alpha",
      "bravo",
      "charlie",
    ]);
  });
});

describe("moveQuickLinkOutOfFolder", () => {
  it("converts a folder to its remaining link when only one link is left", () => {
    const items: QuickLinkItem[] = [
      {
        id: "folder",
        type: "folder",
        name: "Folder",
        links: links.slice(0, 2).map((link) => ({ ...link })),
      },
      { id: "delta", type: "link", name: "Delta", url: "https://delta.example/" },
    ];

    const moved = moveQuickLinkOutOfFolder(items, "folder", "bravo", 1);

    expect(moved).not.toBe(items);
    expect(moved.map((item) => item.id)).toEqual(["alpha", "bravo", "delta"]);
    expect(moved.every((item) => item.type === "link")).toBe(true);
    expect(items[0]?.type).toBe("folder");
  });
});
