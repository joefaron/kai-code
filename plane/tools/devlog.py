# Reset the ESP32 on USB and print its serial log - the first thing to check when
# it "doesn't come up". Needs: pip install pyserial
#   python tools/devlog.py [seconds] [COMPORT]
import serial, time, sys
secs = float(sys.argv[1]) if len(sys.argv) > 1 else 10
s = serial.Serial(sys.argv[2] if len(sys.argv) > 2 else 'COM3', 115200, timeout=0.2)
s.dtr = False; s.rts = True; time.sleep(0.2); s.rts = False   # pulse EN = reset, boot normally
end = time.time() + secs
buf = b''
while time.time() < end:
    buf += s.read(4096)
print(buf.decode('utf-8', 'replace').replace('\r', ''))
