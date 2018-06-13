package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "strconv"

    "github.com/hyperledger/fabric/core/chaincode/shim"
    "github.com/hyperledger/fabric/protos/peer"
)

type UsedCar struct {
    CarNum string `json:"carNum"`
    Make   string `json:"make"`
    Model  string `json:"model"`
    Owner  string `json:"owner"`
}

type SmartContract struct {
}

func (s *SmartContract) Init(stub shim.ChaincodeStubInterface) peer.Response {
    return shim.Success(nil)
}

func (s *SmartContract) Invoke(stub shim.ChaincodeStubInterface) peer.Response {

    function, args := stub.GetFunctionAndParameters()

    if function == "queryCar" {
        return s.queryCar(stub, args)
    } else if function == "initLedger" {
        return s.initLedger(stub)
    } else if function == "createCar" {
        return s.createCar(stub, args)
    } else if function == "queryAllCars" {
        return s.queryAllCars(stub)
    } else if function == "changeCarOwner" {
        return s.changeCarOwner(stub, args)
    }

    return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) queryCar(stub shim.ChaincodeStubInterface, args []string) peer.Response {

    if len(args) != 1 {
        return shim.Error("Incorrect number of arguments. Expecting 1")
    }

    carAsBytes, _ := stub.GetState(args[0])
    return shim.Success(carAsBytes)
}

func (s *SmartContract) initLedger(stub shim.ChaincodeStubInterface) peer.Response {
    cars := []UsedCar{
        Car{CarNum: "35나1234", Make: "Toyota", Model: "Prius", Owner: "Tomoko"},
        Car{CarNum: "38다1237", Make: "Ford", Model: "Mustang", Owner: "Brad"},
        Car{CarNum: "25아1234", Make: "Hyundai", Model: "Tucson", Owner: "Jin Soo"},
        Car{CarNum: "49나1334", Make: "Volkswagen", Model: "Passat", Owner: "Max"},
        Car{CarNum: "27마1234", Make: "Tesla", Model: "S", Owner: "Adriana"},
        Car{CarNum: "22바1234", Make: "Peugeot", Model: "205", Owner: "Michel"},
        Car{CarNum: "37더1234", Make: "Chery", Model: "S22L", Owner: "Aarav"},
        Car{CarNum: "31나1238", Make: "Fiat", Model: "Punto", Owner: "Pari"},
        Car{CarNum: "42마3789", Make: "Tata", Model: "Nano", Owner: "Valeria"},
        Car{CarNum: "35바1234", Make: "Holden", Model: "Barina", Owner: "Shotaro"},
    }

    i := 0
    for i < len(cars) {
        fmt.Println("i is ", i)
        carAsBytes, _ := json.Marshal(cars[i])
        stub.PutState("CAR"+strconv.Itoa(i), carAsBytes)
        fmt.Println("Added", cars[i])
        i++
    }

    return shim.Success(nil)
}

func (s *SmartContract) createCar(stub shim.ChaincodeStubInterface, args []string) peer.Response {

    if len(args) != 5 {
        return shim.Error("Incorrect number of arguments. Expecting 5")
    }

    var car = UsedCar{CarNum: args[1], Make: args[2], Model: args[3], Owner: args[4]}

    carAsBytes, _ := json.Marshal(car)
    stub.PutState(args[0], carAsBytes)

    return shim.Success(nil)
}

func (s *SmartContract) queryAllCars(stub shim.ChaincodeStubInterface) peer.Response {

    startKey := "CAR0"
    endKey := "CAR999"

    resultsIterator, err := stub.GetStateByRange(startKey, endKey)
    if err != nil {
        return shim.Error(err.Error())
    }
    defer resultsIterator.Close()

    var buffer bytes.Buffer
    buffer.WriteString("[")

    bArrayMemberAlreadyWritten := false
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return shim.Error(err.Error())
        }

        if bArrayMemberAlreadyWritten == true {
            buffer.WriteString(",")
        }
        buffer.WriteString("{\"Key\":")
        buffer.WriteString("\"")
        buffer.WriteString(queryResponse.Key)
        buffer.WriteString("\"")

        buffer.WriteString(", \"Record\":")

        buffer.WriteString(string(queryResponse.Value))
        buffer.WriteString("}")
        bArrayMemberAlreadyWritten = true
    }
    buffer.WriteString("]")

    fmt.Printf("- queryAllCars:\n%s\n", buffer.String())

    return shim.Success(buffer.Bytes())
}

func (s *SmartContract) changeCarOwner(stub shim.ChaincodeStubInterface, args []string) peer.Response {

    if len(args) != 2 {
        return shim.Error("Incorrect number of arguments. Expecting 2")
    }

    carAsBytes, _ := stub.GetState(args[0])
    car := UsedCar{}

    json.Unmarshal(carAsBytes, &car)
    car.Owner = args[1]

    carAsBytes, _ = json.Marshal(car)
    stub.PutState(args[0], carAsBytes)

    return shim.Success(nil)
}

func main() {
    err := shim.Start(new(SmartContract))
    if err != nil {
        fmt.Printf("Error creating new Smart Contract: %s", err)
    }
}
