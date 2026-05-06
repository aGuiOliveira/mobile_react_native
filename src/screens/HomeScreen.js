import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import {
  createProduct,
  getProducts,
  deleteProduct,
  updateProduct,
} from "../firebase/productService";

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

  function handleCancelEdit() {
    clearForm();
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

  const inputStyle = {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
  };

  const formHeader = (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginTop: 40, marginBottom: 20 }}>
        Bem-vindo!
      </Text>

      <View style={{ marginBottom: 20 }}>
        <Button title="Ler código de barras" onPress={handleOpenScanner} />
      </View>

      <TextInput
        placeholder="Nome do produto"
        value={name}
        onChangeText={setName}
        returnKeyType="next"
        style={inputStyle}
      />

      <TextInput
        placeholder="Preço (ex: R$ 10,00)"
        value={price}
        onChangeText={(text) => setPrice(formatPrice(text))}
        keyboardType="numeric"
        returnKeyType="next"
        style={inputStyle}
      />

      <TextInput
        placeholder="Código de barras"
        value={barcode}
        onChangeText={setBarcode}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        style={{ ...inputStyle, marginBottom: 20 }}
      />

      <Button
        title={editingProductId ? "Atualizar produto" : "Cadastrar produto"}
        onPress={handleSaveProduct}
      />

      {editingProductId && (
        <View style={{ marginTop: 10 }}>
          <Button title="Cancelar edição" onPress={handleCancelEdit} />
        </View>
      )}

      <Text style={{ fontSize: 20, marginTop: 30, marginBottom: 10 }}>
        Produtos cadastrados
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
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
          <Text style={{ paddingHorizontal: 20 }}>
            Nenhum produto cadastrado.
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              borderWidth: 1,
              borderRadius: 5,
              padding: 10,
              marginBottom: 10,
              marginHorizontal: 20,
            }}
          >
            <Text>Nome: {item.name}</Text>
            <Text>Preço: {item.price}</Text>
            <Text>Código de barras: {item.barcode || "Não informado"}</Text>

            <View style={{ marginTop: 10 }}>
              <Button title="Editar" onPress={() => handleEditProduct(item)} />
            </View>

            <View style={{ marginTop: 10 }}>
              <Button
                title="Excluir"
                color="red"
                onPress={() => handleDeleteProduct(item.id)}
              />
            </View>
          </View>
        )}
      />

      <View style={{ padding: 20 }}>
        <Button title="Sair" onPress={() => navigation.navigate("Login")} />
      </View>
    </KeyboardAvoidingView>
  );
}
