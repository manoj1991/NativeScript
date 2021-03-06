﻿import * as fsModule from "../file-system";
import {
    write as traceWrite, categories as traceCategories, messageType as traceMessageType
} from "../trace";

export * from "./utils-common";

let mainScreenScale;

function isOrientationLandscape(orientation: number) {
    return orientation === UIDeviceOrientation.LandscapeLeft || orientation === UIDeviceOrientation.LandscapeRight;
}

export module layout {
    var MODE_SHIFT = 30;
    var MODE_MASK = 0x3 << MODE_SHIFT;

    export function makeMeasureSpec(size: number, mode: number): number {
        return (Math.round(Math.max(0, size)) & ~MODE_MASK) | (mode & MODE_MASK);
    }

    export function getDisplayDensity(): number {
        return mainScreenScale;
    }

    export function toDevicePixels(value: number): number {
        return value * mainScreenScale;
    }

    export function toDeviceIndependentPixels(value: number): number {
        return value / mainScreenScale;
    }

    export function measureNativeView(nativeView: any /* UIView */, width: number, widthMode: number, height: number, heightMode: number): { width: number, height: number } {
        const view = <UIView>nativeView;
        const nativeSize = view.sizeThatFits({
            width: widthMode === 0 /* layout.UNSPECIFIED */ ? Number.POSITIVE_INFINITY : toDeviceIndependentPixels(width),
            height: heightMode === 0 /* layout.UNSPECIFIED */ ? Number.POSITIVE_INFINITY : toDeviceIndependentPixels(height)
        });

        nativeSize.width = toDevicePixels(nativeSize.width);
        nativeSize.height = toDevicePixels(nativeSize.height);
        return nativeSize;
    }
}

export module ios {
    export function getter<T>(_this: any, property: T | { (): T }): T {
        if (typeof property === "function") {
            return (<{ (): T }>property).call(_this);
        } else {
            return <T>property;
        }
    }

    export module collections {
        export function jsArrayToNSArray(str: string[]): NSArray<any> {
            return NSArray.arrayWithArray(<any>str);
        }

        export function nsArrayToJSArray(a: NSArray<any>): Array<Object> {
            var arr = [];
            if (a !== undefined) {
                let count = a.count;
                for (let i = 0; i < count; i++) {
                    arr.push(a.objectAtIndex(i));
                }
            }

            return arr;
        }
    }

    export function isLandscape(): boolean {
        var device = getter(UIDevice, UIDevice.currentDevice);
        var statusBarOrientation = getter(UIApplication, UIApplication.sharedApplication).statusBarOrientation;
        var isStatusBarOrientationLandscape = isOrientationLandscape(statusBarOrientation);
        return isOrientationLandscape(device.orientation) || isStatusBarOrientationLandscape;
    }

    export var MajorVersion = NSString.stringWithString(getter(UIDevice, UIDevice.currentDevice).systemVersion).intValue;

    export function openFile(filePath: string): boolean {
        try {
            var fs: typeof fsModule = require("file-system");
            var path = filePath.replace("~", fs.knownFolders.currentApp().path)

            var controller = UIDocumentInteractionController.interactionControllerWithURL(NSURL.fileURLWithPath(path));
            controller.delegate = new UIDocumentInteractionControllerDelegateImpl();
            return controller.presentPreviewAnimated(true);
        }
        catch (e) {
            traceWrite("Error in openFile", traceCategories.Error, traceMessageType.error);
        }
        return false;
    }
}

export function GC() {
    __collect();
}

export function openUrl(location: string): boolean {
    try {
        var url = NSURL.URLWithString(location.trim());
        if (ios.getter(UIApplication, UIApplication.sharedApplication).canOpenURL(url)) {
            return ios.getter(UIApplication, UIApplication.sharedApplication).openURL(url);
        }
    }
    catch (e) {
        // We Don't do anything with an error.  We just output it
        traceWrite("Error in OpenURL", traceCategories.Error, traceMessageType.error);
    }
    return false;
}

class UIDocumentInteractionControllerDelegateImpl extends NSObject implements UIDocumentInteractionControllerDelegate {
    public static ObjCProtocols = [UIDocumentInteractionControllerDelegate];

    public getViewController(): UIViewController {
        var frame = require("ui/frame");
        return frame.topmost().currentPage.ios;
    }

    public documentInteractionControllerViewControllerForPreview(controller: UIDocumentInteractionController) {
        return this.getViewController();
    }

    public documentInteractionControllerViewForPreview(controller: UIDocumentInteractionController) {
        return this.getViewController().view;
    }

    public documentInteractionControllerRectForPreview(controller: UIDocumentInteractionController): CGRect {
        return this.getViewController().view.frame;
    }
}

mainScreenScale = ios.getter(UIScreen, UIScreen.mainScreen).scale;
