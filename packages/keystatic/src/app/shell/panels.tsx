import {
  SplitView,
  SplitPanePrimary,
  SplitPaneSecondary,
} from '@keystar/ui/split-view';
import { breakpointQueries, useMediaQuery } from '@keystar/ui/style';
import { ReactNode, useRef } from 'react';

import { ContentPanelProvider, useContentPanelState } from './context';
import { SidebarDialog, SidebarPanel, useSidebar } from './sidebar';
import { useFocusMode, useFocusModeShortcut } from '../focus-mode';

// Main panel layout
// -----------------------------------------------------------------------------

export const MainPanelLayout = (props: { children: ReactNode }) => {
  let isBelowDesktop = useMediaQuery(breakpointQueries.below.desktop);
  let sidebarState = useSidebar();
  // FORK (devinchaloux): focus mode collapses the navigation too.
  let focused = useFocusMode();
  useFocusModeShortcut();
  let ref = useRef<HTMLDivElement>(null);
  let context = useContentPanelState(ref);

  return (
    <ContentPanelProvider value={context}>
      <SplitView
        autoSaveId="keystatic-app-split-view"
        isCollapsed={isBelowDesktop || !sidebarState.isOpen || focused}
        onCollapseChange={sidebarState.toggle}
        defaultSize={260}
        minSize={180}
        maxSize={400}
        // styles
        height="100vh"
      >
        {isBelowDesktop ? (
          <SidebarDialog />
        ) : (
          <SplitPanePrimary>
            <SidebarPanel />
          </SplitPanePrimary>
        )}
        <SplitPaneSecondary ref={ref}>{props.children}</SplitPaneSecondary>
      </SplitView>
    </ContentPanelProvider>
  );
};
