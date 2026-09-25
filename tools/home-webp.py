"""Convert the recorded attract-mode loop (.play-local/home.gif, from .play-local/record-home.mjs) into the lossless
animated WebP used as the home background (games/stay-rare/home.webp); the FriendSDK build has no .gif loader."""
from PIL import Image, ImageSequence

frames = [f.convert('RGB') for f in ImageSequence.Iterator(Image.open('.play-local/home.gif'))]
frames[0].save('games/stay-rare/home.webp', save_all=True, append_images=frames[1:], duration=125, loop=0, lossless=True, method=6)
print('home.webp', len(frames), 'frames')
