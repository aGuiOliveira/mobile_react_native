import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
} from "react-native";
import {
  createProduct,
  getProducts,
  deleteProduct,
  updateProduct,
} from "../firebase/productService";
import { colors } from "../theme/colors";

function formatPrice(text) {
  const digits = text.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const reais = (cents / 100).toFixed(2);
  const [intPart, decPart] = reais.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${formattedInt},${decPart}`;
}

export default function HomeScreen({ navigation, route }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [products, setProducts] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

  async function loadProducts() {
    try {
      const productList = await getProducts();
      setProducts(productList);
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar os produtos.");
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (route.params?.scannedBarcode) {
      setBarcode(String(route.params.scannedBarcode));
      if (route.params?.savedName !== undefined) setName(route.params.savedName);
      if (route.params?.savedPrice !== undefined) setPrice(route.params.savedPrice);
    }
  }, [route.params?.scannedBarcode]);

  function clearForm() {
    setName("");
    setPrice("");
    setBarcode("");
    setEditingProductId(null);
  }

  async function handleSaveProduct() {
    if (!name.trim() || !price.trim()) {
      Alert.alert("Atenção", "Preencha nome e preço do produto.");
      return;
    }

    const productData = {
      name: name.trim(),
      price: price.trim(),
      barcode: barcode ? String(barcode).trim() : "",
    };

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, productData);
        Alert.alert("Sucesso", "Produto atualizado com sucesso!");
      } else {
        await createProduct(productData);
        Alert.alert("Sucesso", "Produto cadastrado com sucesso!");
      }
      clearForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível salvar o produto.");
    }
  }

  function handleEditProduct(product) {
    setName(product.name || "");
    setPrice(product.price || "");
    setBarcode(product.barcode || "");
    setEditingProductId(product.id);
  }

  function handleDeleteProduct(productId) {
    Alert.alert(
      "Confirmar exclusão",
      "Tem certeza que deseja excluir este produto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProduct(productId);
              if (editingProductId === productId) clearForm();
              Alert.alert("Sucesso", "Produto excluído com sucesso!");
              await loadProducts();
            } catch (error) {
              console.error(error);
              Alert.alert("Erro", "Não foi possível excluir o produto.");
            }
          },
        },
      ]
    );
  }

  function handleOpenScanner() {
    navigation.navigate("BarcodeScanner", {
      currentName: name,
      currentPrice: price,
    });
  }

  const formHeader = (
    <View style={styles.formContainer}>
      <Text style={styles.welcomeTitle}>Bem-vindo!</Text>

      <TouchableOpacity style={styles.scanButton} onPress={handleOpenScanner}>
        <Text style={styles.scanButtonText}>Ler código de barras</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Nome do produto"
        placeholderTextColor={colors.placeholder}
        value={name}
        onChangeText={setName}
        returnKeyType="next"
        style={styles.input}
      />

      <TextInput
        placeholder="Preço (ex: R$ 10,00)"
        placeholderTextColor={colors.placeholder}
        value={price}
        onChangeText={(text) => setPrice(formatPrice(text))}
        keyboardType="numeric"
        returnKeyType="next"
        style={styles.input}
      />

      <TextInput
        placeholder="Código de barras"
        placeholderTextColor={colors.placeholder}
        value={barcode}
        onChangeText={setBarcode}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        style={[styles.input, { marginBottom: 20 }]}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSaveProduct}>
        <Text style={styles.primaryButtonText}>
          {editingProductId ? "Atualizar produto" : "Cadastrar produto"}
        </Text>
      </TouchableOpacity>

      {editingProductId && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => clearForm()}
        >
          <Text style={styles.secondaryButtonText}>Cancelar edição</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Produtos cadastrados</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={formHeader}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum produto cadastrado.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productDetail}>Preço: {item.price}</Text>
            <Text style={styles.productDetail}>
              Código: {item.barcode || "Não informado"}
            </Text>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditProduct(item)}
              >
                <Text style={styles.editButtonText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteProduct(item.id)}
              >
                <Text style={styles.deleteButtonText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formContainer: {
    padding: 24,
    paddingTop: 52,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#0D1117',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 28,
    marginBottom: 4,
  },
  emptyText: {
    color: colors.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 24,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  logoutContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
});
