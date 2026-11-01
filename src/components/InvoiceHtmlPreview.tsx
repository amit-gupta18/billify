import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';

/** A4 width at 96 CSS px/in ≈ 794px */
export const A4_PREVIEW_WIDTH_PX = 794;

type Props = {
  html: string;
};

export function InvoiceHtmlPreview({ html }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const horizontalPad = 16;
  const pageWidth = Math.min(windowWidth - horizontalPad * 2, A4_PREVIEW_WIDTH_PX);
  const pageHeight = pageWidth * (297 / 210);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
    >
      <View style={[styles.pageFrame, { width: pageWidth, height: pageHeight }]}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={{ width: pageWidth, height: pageHeight, backgroundColor: '#fff' }}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          {...(Platform.OS === 'android'
            ? {
                androidLayerType: 'hardware' as const,
                setBuiltInZoomControls: false,
                setDisplayZoomControls: false,
              }
            : {})}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  pageFrame: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    overflow: 'hidden',
  },
});
