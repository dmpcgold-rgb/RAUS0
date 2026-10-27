package at.rauso.app;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import androidx.webkit.WebViewAssetLoader;
public class MainActivity extends Activity {
 private WebView web;
 @Override public void onCreate(Bundle state) {
 super.onCreate(state);
 WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
 web=new WebView(this);
 WebSettings settings=web.getSettings();
 settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
 settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
 web.setWebViewClient(new WebViewClient(){
 @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view,android.webkit.WebResourceRequest request){return loader.shouldInterceptRequest(request.getUrl());}
 });
 setContentView(web);
 if(state==null)web.loadUrl("https://appassets.androidplatform.net/assets/index.html");else web.restoreState(state);
 }
 @Override protected void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
 @Override protected void onDestroy(){web.destroy();super.onDestroy();}
}
