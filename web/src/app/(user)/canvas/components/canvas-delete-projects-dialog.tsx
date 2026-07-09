"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAssetStore } from "@/stores/use-asset-store";
import { useCanvasStore } from "../stores/use-canvas-store";
import { useCanvasUiStore } from "../stores/use-canvas-ui-store";

export function CanvasDeleteProjectsDialog() {
    const ids = useCanvasUiStore((state) => state.deleteProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const removeSelectedIds = useCanvasUiStore((state) => state.removeSelectedProjectIds);
    const deleteProjects = useCanvasStore((state) => state.deleteProjects);
    const cleanupImages = useAssetStore((state) => state.cleanupImages);
    const confirm = () => {
        deleteProjects(ids);
        cleanupImages();
        removeSelectedIds(ids);
        setDeleteIds([]);
    };

    return (
        <Dialog open={ids.length > 0} onOpenChange={(open) => !open && setDeleteIds([])}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>删除画布？</DialogTitle>
                    <DialogDescription>将删除 {ids.length} 个画布，里面的节点和连线也会一起移除。</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteIds([])}>
                        取消
                    </Button>
                    <Button variant="destructive" onClick={confirm}>
                        删除
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
