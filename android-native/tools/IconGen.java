import java.awt.image.BufferedImage;
import java.awt.Graphics2D;
import java.awt.Color;
import javax.imageio.ImageIO;
import java.io.File;

public class IconGen {
  // Draw a 24x24 pixel-art doorway, scale up with nearest-neighbour for crisp pixels.
  static int[][] art() {
    int S=24; int[][] g=new int[S][S]; // 0=black,1=white,2=gray
    // doorway frame centered, light bleeding from the gap
    for(int y=0;y<S;y++) for(int x=0;x<S;x++){
      boolean frameL = x==7 && y>=4 && y<=21;
      boolean frameR = x==16 && y>=4 && y<=21;
      boolean frameT = y==4 && x>=7 && x<=16;
      boolean gap = x>=11 && x<=12 && y>=4 && y<=21; // open slit, light
      if(gap) g[y][x]=1;
      else if(frameL||frameR||frameT) g[y][x]=1;
      else if(x>7 && x<16 && y>4 && y<22){
        // faint light spill near the gap
        int d=Math.abs(x-11); g[y][x] = (d<=2 && (x+y)%2==0)?2:0;
      } else g[y][x]=0;
    }
    return g;
  }
  public static void main(String[] a) throws Exception {
    int[][] g=art(); int S=24;
    Color black=new Color(8,8,8), white=new Color(244,244,240), gray=new Color(90,90,88);
    int[] sizes={72,144,192};
    String[] dirs={a[0]+"/mipmap-hdpi",a[0]+"/mipmap-xxhdpi",a[0]+"/mipmap-xxxhdpi"};
    for(int s=0;s<sizes.length;s++){
      int SZ=sizes[s]; int px=SZ/S;
      BufferedImage img=new BufferedImage(SZ,SZ,BufferedImage.TYPE_INT_ARGB);
      Graphics2D gr=img.createGraphics();
      gr.setColor(black); gr.fillRect(0,0,SZ,SZ);
      for(int y=0;y<S;y++)for(int x=0;x<S;x++){
        int v=g[y][x]; if(v==0) continue;
        gr.setColor(v==1?white:gray);
        gr.fillRect(x*px,y*px,px,px);
      }
      gr.dispose();
      new File(dirs[s]).mkdirs();
      ImageIO.write(img,"png",new File(dirs[s]+"/ic_launcher.png"));
      System.out.println("wrote "+dirs[s]+"/ic_launcher.png ("+SZ+"px)");
    }
  }
}
