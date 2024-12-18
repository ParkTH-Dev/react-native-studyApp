import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const API_KEY = "6dffc398b1c20ab59a176e13cfbc1e9f";

const KOREAN_CITIES = [
  { name: "서울", lat: 37.5665, lon: 126.978 },
  { name: "부산", lat: 35.1796, lon: 129.0756 },
  { name: "인천", lat: 37.4563, lon: 126.7052 },
  { name: "대구", lat: 35.8714, lon: 128.6014 },
  { name: "대전", lat: 36.3504, lon: 127.3845 },
  { name: "광주", lat: 35.1595, lon: 126.8526 },
  { name: "울산", lat: 35.5384, lon: 129.3114 },
  { name: "제주", lat: 33.4996, lon: 126.5312 },
];

const weatherIcons = {
  Clear: "sunny",
  Clouds: "cloudy",
  Rain: "rainy",
  Atmosphere: "cloud",
  Snow: "snow",
  Drizzle: "umbrella",
  Thunderstorm: "thunderstorm",
};

export default function App() {
  const [city, setCity] = useState("Loading...");
  const [days, setDays] = useState([]);
  const [ok, setOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [memos, setMemos] = useState({});
  const [editingMemo, setEditingMemo] = useState(null);
  const [memoText, setMemoText] = useState("");

  const loadMemos = async () => {
    try {
      const savedMemos = await AsyncStorage.getItem("weatherMemos");
      if (savedMemos) {
        setMemos(JSON.parse(savedMemos));
      }
    } catch (error) {
      console.error("메모 불러오기 실패:", error);
    }
  };

  const saveMemo = async (date, memo) => {
    try {
      const newMemos = { ...memos, [date]: memo };
      await AsyncStorage.setItem("weatherMemos", JSON.stringify(newMemos));
      setMemos(newMemos);
      setEditingMemo(null);
      setMemoText("");
    } catch (error) {
      Alert.alert("오류", "메모 저장에 실패했습니다.");
    }
  };

  const getWeatherByCoords = async (latitude, longitude, cityName) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      );

      const filteredDays = response.data.list.filter((weather) => {
        const hour = new Date(weather.dt * 1000).getHours();
        return hour === 12;
      });

      setDays(filteredDays);
      setCity(cityName);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setOk(false);
        return;
      }

      const {
        coords: { latitude, longitude },
      } = await Location.getCurrentPositionAsync({ accuracy: 5 });

      const location = await Location.reverseGeocodeAsync(
        { latitude, longitude },
        { useGoogleMaps: false }
      );

      getWeatherByCoords(
        latitude,
        longitude,
        location[0].city || location[0].district
      );
    } catch (error) {
      console.error(error);
    }
  };

  const selectCity = (selectedCity) => {
    setModalVisible(false);
    setLoading(true);
    getWeatherByCoords(selectedCity.lat, selectedCity.lon, selectedCity.name);
  };

  useEffect(() => {
    getCurrentLocation();
    loadMemos();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TouchableOpacity
        style={styles.citySelector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.cityName}>{city}</Text>
        <Ionicons name="location" size={28} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.currentLocationBtn}
              onPress={() => {
                setModalVisible(false);
                setLoading(true);
                getCurrentLocation();
              }}
            >
              <Text style={styles.cityOption}>현재 위치</Text>
            </TouchableOpacity>
            {KOREAN_CITIES.map((city, index) => (
              <TouchableOpacity
                key={index}
                style={styles.cityButton}
                onPress={() => selectCity(city)}
              >
                <Text style={styles.cityOption}>{city.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editingMemo !== null}
        onRequestClose={() => setEditingMemo(null)}
      >
        <View style={styles.modalView}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>메모 작성</Text>
            <TextInput
              style={styles.memoInput}
              multiline
              placeholder="메모를 입력하세요"
              value={memoText}
              onChangeText={setMemoText}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => saveMemo(editingMemo, memoText)}
              >
                <Text style={styles.buttonText}>저장</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEditingMemo(null);
                  setMemoText("");
                }}
              >
                <Text style={styles.buttonText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="white" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.weatherContainer}
        >
          {days.map((day, index) => {
            const date = new Date(day.dt * 1000).toLocaleDateString();
            return (
              <View key={index} style={styles.day}>
                <Text style={styles.date}>{date}</Text>
                <View style={styles.weatherInfo}>
                  <Text style={styles.temp}>{Math.round(day.main.temp)}°</Text>
                  <View style={styles.weatherDetails}>
                    <Ionicons
                      name={weatherIcons[day.weather[0].main] || "cloud"}
                      size={68}
                      color="white"
                    />
                    <Text style={styles.desc}>{day.weather[0].main}</Text>
                    <Text style={styles.tinyText}>
                      {day.weather[0].description}
                    </Text>
                  </View>
                </View>

                <View style={styles.memoContainer}>
                  {memos[date] ? (
                    <TouchableOpacity
                      style={styles.memoBox}
                      onPress={() => {
                        setMemoText(memos[date]);
                        setEditingMemo(date);
                      }}
                    >
                      <Text style={styles.memoText}>{memos[date]}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.addMemoButton}
                      onPress={() => {
                        setMemoText("");
                        setEditingMemo(date);
                      }}
                    >
                      <Text style={styles.addMemoText}>메모 추가</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e3799",
  },
  citySelector: {
    paddingTop: 50,
    paddingBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  cityName: {
    fontSize: 40,
    fontWeight: "500",
    color: "white",
    marginRight: 10,
  },
  weatherContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  day: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  date: {
    fontSize: 20,
    color: "white",
    marginBottom: 15,
    fontWeight: "600",
  },
  weatherInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  temp: {
    fontSize: 80,
    fontWeight: "600",
    color: "white",
  },
  weatherDetails: {
    alignItems: "center",
  },
  desc: {
    marginTop: 10,
    fontSize: 24,
    color: "white",
    fontWeight: "500",
  },
  tinyText: {
    fontSize: 16,
    color: "white",
    marginTop: 5,
  },
  memoContainer: {
    marginTop: 20,
    width: "100%",
  },
  memoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 10,
    padding: 15,
    minHeight: 80,
  },
  memoText: {
    color: "white",
    fontSize: 16,
  },
  addMemoButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  addMemoText: {
    color: "white",
    fontSize: 16,
  },
  modalView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1e3799",
  },
  memoInput: {
    width: "100%",
    height: 120,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    padding: 10,
    borderRadius: 10,
    width: "48%",
  },
  saveButton: {
    backgroundColor: "#1e3799",
  },
  cancelButton: {
    backgroundColor: "#95a5a6",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
