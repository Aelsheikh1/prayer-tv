import React, { useEffect, useState, useRef } from 'react';
import { PrayerTimes as AdhanPrayerTimes, Coordinates, CalculationParameters } from 'adhan';
import { format, differenceInMinutes, addHours } from 'date-fns';
import { Box, Typography, Paper, Button } from '@mui/material';

const CAIRO_COORDINATES = new Coordinates(30.0444, 31.2357);

// Configure Egyptian calculation parameters
const params = new CalculationParameters('Egyptian', 18, 17.5);
params.madhab = 'shafi';

// Prayer emoji mappings
const prayerEmojis: { [key: string]: string } = {
  'Fajr': '🌅',
  'Sunrise': '☀️',
  'Dhuhr': '🌞',
  'Asr': '🌤️',
  'Maghrib': '🌅',
  'Isha': '🌙',
};

interface Prayer {
  name: string;
  time: Date;
  isNext: boolean;
  isCurrent: boolean;
}

const PrayerTimes: React.FC = () => {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isVisible, setIsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<string>('');
  const [isTestAdhanPlaying, setIsTestAdhanPlaying] = useState(false);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  const calculatePrayerTimes = () => {
    const date = new Date();
    const prayerTimes = new AdhanPrayerTimes(CAIRO_COORDINATES, date, params);

    const prayerList = [
      { name: 'Fajr', time: prayerTimes.fajr },
      { name: 'Sunrise', time: prayerTimes.sunrise },
      { name: 'Dhuhr', time: prayerTimes.dhuhr },
      { name: 'Asr', time: prayerTimes.asr },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isha', time: prayerTimes.isha },
    ];

    const now = new Date();
    let nextPrayerIndex = prayerList.findIndex(prayer => prayer.time > now);
    if (nextPrayerIndex === -1) nextPrayerIndex = 0;

    // Find current prayer considering 1-hour duration
    const updatedPrayers = prayerList.map((prayer, index) => {
      const prayerEndTime = addHours(prayer.time, 1);
      const isCurrentPrayer = now >= prayer.time && now <= prayerEndTime;
      const isNextPrayer = index === nextPrayerIndex || 
        (index > 0 && index < nextPrayerIndex && now > prayerList[index-1].time);

      return {
        ...prayer,
        isNext: isNextPrayer,
        isCurrent: isCurrentPrayer,
      };
    });

    setPrayers(updatedPrayers);

    // Check if it's prayer time
    updatedPrayers.forEach(prayer => {
      const diffInMinutes = differenceInMinutes(prayer.time, now);
      if (diffInMinutes === 0 && currentPrayer !== prayer.name) {
        showPrayerNotification(prayer.name);
      }
    });
  };

  const showPrayerNotification = (prayerName: string) => {
    setCurrentPrayer(prayerName);
    setIsVisible(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.error('Error playing Adhan:', error);
      });
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.currentTime = 0;
    }
    setIsTestAdhanPlaying(false);
  };

  const handleAudioEnded = () => {
    setIsVisible(false);
    setCurrentPrayer('');
    setIsTestAdhanPlaying(false);
  };

  const toggleTestAdhan = () => {
    if (!testAudioRef.current) {
      testAudioRef.current = new Audio('/adhan.mp3');
      testAudioRef.current.onended = handleAudioEnded;
    }

    if (isTestAdhanPlaying) {
      testAudioRef.current.pause();
      testAudioRef.current.currentTime = 0;
      setIsTestAdhanPlaying(false);
      setCurrentPrayer('');
    } else {
      testAudioRef.current.play().catch(error => {
        console.error('Error playing test Adhan:', error);
      });
      setIsTestAdhanPlaying(true);
      setCurrentPrayer('Test Prayer');
    }
  };

  useEffect(() => {
    calculatePrayerTimes();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      calculatePrayerTimes();
    }, 1000);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    return () => {
      clearInterval(timer);
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current.currentTime = 0;
      }
    };
  }, []);

  return (
    <Box
      sx={{
        height: '100vh',
        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: 'white',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      <Button
        onClick={handleClose}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          color: 'white',
          border: '1px solid white',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        Close ✖️
      </Button>
      <Typography variant="h2" sx={{ mb: 4, fontWeight: 'bold' }}>
        {format(currentTime, 'hh:mm:ss a')} ⏰
      </Typography>
      {currentPrayer && (
        <Typography variant="h3" sx={{ mb: 4, color: '#4caf50', display: 'flex', alignItems: 'center', gap: 2 }}>
          {prayerEmojis[currentPrayer] || '🕌'} {currentPrayer} Prayer Time
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 3,
          width: '100%',
          maxWidth: 1200,
        }}
      >
        {prayers.map((prayer) => (
          <Paper
            key={prayer.name}
            elevation={prayer.isNext || prayer.isCurrent ? 24 : 4}
            sx={{
              padding: 3,
              textAlign: 'center',
              background: prayer.isCurrent
                ? 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)'
                : prayer.isNext
                ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
                : 'rgba(255, 255, 255, 0.1)',
              transform: (prayer.isNext || prayer.isCurrent) ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'scale(1.1)',
              },
            }}
          >
            <Typography variant="h3" sx={{ color: 'white', mb: 1 }}>
              {prayerEmojis[prayer.name]}
            </Typography>
            <Typography variant="h4" sx={{ color: 'white', mb: 1 }}>
              {prayer.name}
              {prayer.isCurrent && ' (Now)'}
              {prayer.isNext && ' (Next)'}
            </Typography>
            <Typography variant="h5" sx={{ color: 'white' }}>
              {format(prayer.time, 'hh:mm a')}
            </Typography>
          </Paper>
        ))}
      </Box>
      <Button
        onClick={toggleTestAdhan}
        sx={{
          mt: 4,
          color: 'white',
          border: '1px solid white',
          fontSize: '1.2rem',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        {isTestAdhanPlaying ? 'Stop Adhan 🔇' : 'Test Adhan 🎵'}
      </Button>
      <audio
        ref={audioRef}
        src="/adhan.mp3"
        onEnded={handleAudioEnded}
      />
    </Box>
  );
};

export default PrayerTimes;
