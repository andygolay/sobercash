import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { usePetraWallet } from "../contexts/PetraWalletContext";
import { contractService } from "../utils/contractService";

export default function SettingsScreen({ navigation }) {
  const { isConnected, walletAddress, signAndSubmitTransaction } = usePetraWallet();
  const [exSubstances, setExSubstances] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newSubstance, setNewSubstance] = useState({
    name: "",
    costPerDay: "",
    hoursPerDay: "",
    quitDate: "",
  });
  const [nameError, setNameError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Load substances from contract when wallet connects
  useEffect(() => {
    if (isConnected && walletAddress) {
      loadSubstancesFromContract();
    }
  }, [isConnected, walletAddress]);

  // Load substances from the blockchain
  const loadSubstancesFromContract = async () => {
    if (!isConnected || !walletAddress) return;

    try {
      setIsLoading(true);
      // Just log that we're connected - don't auto-initialize
      console.log('Wallet connected, ready to add substances');
    } catch (error) {
      console.log('Error loading substances:', error);
      Alert.alert('Error', 'Failed to load substances from blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize user on the blockchain
  const initializeUser = async () => {
    try {
      const transaction = contractService.initializeUser();
      await signAndSubmitTransaction(transaction, 'User initialized on blockchain!');
    } catch (error) {
      console.log('Error initializing user:', error);
      Alert.alert('Error', 'Failed to initialize user on blockchain');
    }
  };

  const removeSubstance = async (id) => {
    if (!isConnected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    Alert.alert(
      "Remove Substance",
      "Are you sure you want to remove this ex-substance?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const substance = exSubstances.find(item => item.id === id);
              if (substance) {
                // Call contract to remove substance
                const transaction = contractService.removeSubstance(substance.name);
                await signAndSubmitTransaction(transaction, `Substance ${substance.name} removed!`);

                // Update local state
                setExSubstances(exSubstances.filter((item) => item.id !== id));
              }
            } catch (error) {
              console.log('Error removing substance:', error);
              Alert.alert('Error', 'Failed to remove substance from blockchain');
            }
          },
        },
      ],
    );
  };

  const addNewSubstance = () => {
    setShowAddModal(true);
  };

  const handleAddSubstance = async () => {
    if (!isConnected || !walletAddress) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    // Validate inputs
    if (!newSubstance.name.trim()) {
      Alert.alert("Error", "Please enter a substance name");
      return;
    }

    // Check for duplicate substance names
    const substanceName = newSubstance.name.trim();
    const existingSubstance = exSubstances.find(substance =>
      substance.name.toLowerCase() === substanceName.toLowerCase()
    );
    if (existingSubstance) {
      Alert.alert("Error", "Please add a substance with a unique name.");
      return;
    }

    if (!newSubstance.costPerDay || isNaN(Number(newSubstance.costPerDay))) {
      Alert.alert("Error", "Please enter a valid cost per day");
      return;
    }
    if (!newSubstance.hoursPerDay || isNaN(Number(newSubstance.hoursPerDay))) {
      Alert.alert("Error", "Please enter valid hours per day");
      return;
    }
    if (Number(newSubstance.hoursPerDay) > 24) {
      Alert.alert("Error", "Hours per day cannot exceed 24 hours");
      return;
    }
    if (!newSubstance.quitDate.trim()) {
      Alert.alert("Error", "Please enter a quit date");
      return;
    }

    try {
      // Check if wallet is properly connected
      if (!isConnected || !walletAddress) {
        Alert.alert('Error', 'Wallet not properly connected. Please reconnect.');
        return;
      }

      // Check if user is already initialized before trying to initialize
      console.log('Checking if user is initialized...');
      const isInitialized = await contractService.isUserInitialized(walletAddress);
      console.log('User initialized status:', isInitialized);

      if (!isInitialized) {
        try {
          console.log('User not initialized, initializing now...');
          const initTransaction = contractService.initializeUser();
          await signAndSubmitTransaction(initTransaction);
          console.log('User initialized successfully');
        } catch (initError) {
          console.log('Error initializing user:', initError.message);
          Alert.alert('Error', 'Failed to initialize user on blockchain');
          return;
        }
      } else {
        console.log('User already initialized, skipping initialization');
      }

      // Convert quit date to timestamp
      const quitDate = new Date(selectedDate);
      const quitTimestamp = Math.floor(quitDate.getTime() / 1000);

      // Convert cost to cents
      const costPerDayCents = Math.floor(Number(newSubstance.costPerDay) * 100);

      // Call contract to add substance
      console.log('Creating add_substance transaction...');
      const transaction = contractService.addSubstance(
        newSubstance.name.trim(),
        costPerDayCents,
        Number(newSubstance.hoursPerDay),
        quitTimestamp
      );
      console.log('Add substance transaction:', transaction);

      console.log('Sending add_substance transaction to Petra...');
      await signAndSubmitTransaction(transaction, `Substance ${newSubstance.name.trim()} added!`);
      console.log('Add substance transaction sent successfully');

      // Add to local state
      const substance = {
        id: Date.now().toString(),
        name: newSubstance.name.trim(),
        costPerDay: Number(newSubstance.costPerDay),
        hoursPerDay: Number(newSubstance.hoursPerDay),
        quitDate: newSubstance.quitDate.trim(),
        quitTimestamp: quitTimestamp,
        isActive: true,
      };

      setExSubstances([...exSubstances, substance]);
      setNewSubstance({
        name: "",
        costPerDay: "",
        hoursPerDay: "",
        quitDate: "",
      });
      setShowAddModal(false);

      // Success message will be shown by Petra wallet context after transaction completes
    } catch (error) {
      console.log('Error adding substance:', error);
      Alert.alert('Error', 'Failed to add substance to blockchain');
    }
  };

  const cancelAddSubstance = () => {
    setNewSubstance({
      name: "",
      costPerDay: "",
      hoursPerDay: "",
      quitDate: "",
    });
    setShowAddModal(false);
    setShowDatePicker(false);
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setSelectedDate(selectedDate);
      const formattedDate = `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}/${selectedDate.getFullYear().toString().slice(-2)}`;
      setNewSubstance({ ...newSubstance, quitDate: formattedDate });
    }
  };

  const formatDate = (dateStr) => {
    return `quit ${dateStr}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>My Ex-substances</Text>

        <View style={styles.substancesList}>
          {exSubstances.map((substance) => (
            <View key={substance.id} style={styles.substanceRow}>
              <View style={styles.substanceInfo}>
                <Text style={styles.substanceName}>{substance.name}</Text>
                <View style={styles.substanceDetails}>
                  <Text style={styles.detailText}>
                    ${substance.costPerDay}/day
                  </Text>
                  <Text style={styles.detailText}>•</Text>
                  <Text style={styles.detailText}>
                    {substance.hoursPerDay} hr/day
                  </Text>
                  <Text style={styles.detailText}>•</Text>
                  <Text style={styles.detailText}>
                    {formatDate(substance.quitDate)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeSubstance(substance.id)}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={24}
                  color="#e74c3c"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addNewSubstance}>
          <Ionicons name="add-circle-outline" size={24} color="#27ae60" />
          <Text style={styles.addButtonText}>Add new ex-substance</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Substance Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelAddSubstance}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Ex-substance</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={cancelAddSubstance}
              >
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Substance Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSubstance.name}
                  onChangeText={(text) =>
                    setNewSubstance({ ...newSubstance, name: text })
                  }
                  placeholder="e.g., Cigarettes, Alcohol, Coffee"
                  placeholderTextColor="#adb5bd"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cost per Day ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSubstance.costPerDay}
                  onChangeText={(text) =>
                    setNewSubstance({ ...newSubstance, costPerDay: text })
                  }
                  placeholder="0"
                  placeholderTextColor="#adb5bd"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hours per Day</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSubstance.hoursPerDay}
                  onChangeText={(text) =>
                    setNewSubstance({ ...newSubstance, hoursPerDay: text })
                  }
                  placeholder="0"
                  placeholderTextColor="#adb5bd"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quit Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={showDatePickerModal}
                >
                  <Text
                    style={[
                      styles.dateButtonText,
                      !newSubstance.quitDate && styles.placeholderText,
                    ]}
                  >
                    {newSubstance.quitDate || "Select quit date"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6c757d" />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelAddSubstance}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddSubstance}
              >
                <Text style={styles.saveButtonText}>Add Substance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 20,
  },
  substancesList: {
    marginBottom: 30,
  },
  substanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  substanceInfo: {
    flex: 1,
  },
  substanceName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 6,
  },
  substanceDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  detailText: {
    fontSize: 14,
    color: "#6c757d",
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
    marginLeft: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#27ae60",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#27ae60",
    shadowColor: "#27ae60",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#2c3e50",
    backgroundColor: "#f8f9fa",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  placeholderText: {
    color: "#adb5bd",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dee2e6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6c757d",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#27ae60",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
