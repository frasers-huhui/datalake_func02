
const { GraphQLClient, request, gql } = require('graphql-request');
const { Parser } = require('json-2-csv');
const fields = ['building.buildingName', 'building.id', 'categoryType', 'conditionType', 'contractNo', 'corpbillingorders.contractNo', 'corpbillingorders.transactionStatus', 'createdAt', 'endDate', 'forExpirationPurpose', 'id', 'isCancelable', 'isPublicOrder', 'measurementType', 'monthlyPaymentAmount', 'notFoc', 'numberOfMonths', 'paymentAmount', 'paymentAmountGst', 'startDate', 'tenant.id', 'tenant.tenantCompany', 'transactionStatus'];
const bb_url = process.env["bb_url"];

module.exports = async function (context, req) {
	context.log('starting of log');
    context.log('Start calling graphql API.');

    //check if username and password is passed
    if(!req.body.username || !req.body.password){
        context.res = {
            status: 400, /* Defaults to 200 */
            body: {
                'error': 'username and password is mandatory'
            }
        };
    }
    //query BB data API
    else{
        const username = req.body.username;
        const password = req.body.password;
        const query = gql`
        mutation login {
            login(
            authProfileUuid: "876144b535a84d36b6b38c87309ecd4f", 
            username: "` + username + `", 
            password: "` + password + `"
            ) {
            jwtToken
            }
        }`;

        let result;

        await request(bb_url, query).then((data) => {
            context.log(data);
            result = data;
        })
        
        const token = result.login.jwtToken;

        const buildingCountQuery = `{
                                        allBuilding {
                                            totalCount
                                        }
                                    }`;

        const orderCountQuery = `{
            allOrders {
                totalCount
            }
        }`;

        const graphQLClient = new GraphQLClient(bb_url, {
            headers: {
                authorization: 'Bearer ' + token,
            },
        })

        const totalCountBuilding = await graphQLClient.request(buildingCountQuery);
        const totalBuildingCount = totalCountBuilding.allBuilding.totalCount;

        const totalCountOrder = await graphQLClient.request(orderCountQuery);
        const totalOrderCount = totalCountOrder.allOrders.totalCount;

        context.log(totalOrderCount);

        let building_list = [];
        for(let i = 0; i < totalBuildingCount; i = i + 50){
            const buildingQuery = `{
                allBuilding (take: 50, skip:`+ i + `){
                    results{
                    id
                    buildingCode
                    buildingName
                    carLotsUsed
                    companyCode
                    country
                    countryCode
                    cseUpstairsAllocation
                    cseUpstairsLeft
                    hasMotorcycleLot
                    hasMultipleZone
                    mLotsUsed
                    totLots
                    totLotsLeft
                    totalCarLotsAdditional
                    totalCarLots
                    totMcLotsLeft
                    totMcLots
                    tenantRate
                    sumAllocatedM
                    sumAllocatedCar
                    publicRate
                    numberTagCarAllow
                    totalSeasonParkingLots
                    updatedAt
                    }
                }
            }`

            const buildingQueryData = await graphQLClient.request(buildingQuery);
            building_list = building_list.concat(buildingQueryData.allBuilding.results);
        }

        const buildingParser = new Parser();
        const building_csv = buildingParser.parse(building_list);
        context.bindings.buildingOutputBlob = building_csv;
        context.log('building update success')

        let order_list = [];
        for(let i = 0; i < totalOrderCount; i = i + 200){
            const orderQuery = `{
                allOrders (take: 200, skip: ` + i + `) {
                    results{
                    id
                    building{
                        id
                        buildingName
                    }
                    tenant{
                        id
                        tenantCompany
                    }
                    categoryType
                    conditionType
                    createdAt
                    forExpirationPurpose
                    isCancelable
                    isPublicOrder
                    measurementType
                    monthlyPaymentAmount
                    notFoc
                    paymentAmount
                    paymentAmountGst
                    transactionStatus
                    startDate
                    endDate
                    numberOfMonths
                    contractNo
                    updatedAt
                    corpbillingorders{
                        contractNo
                        transactionStatus
                    }
                    }
                }
            }`

            const orderQueryData = await graphQLClient.request(orderQuery);
            //console.log(orderQueryData.allOrders.results);
            order_list = order_list.concat(orderQueryData.allOrders.results);
        }

        const fields = ['building.buildingName', 'building.id', 'categoryType', 'conditionType', 'contractNo', 'corpbillingorders.contractNo', 'corpbillingorders.transactionStatus', 'createdAt', 'endDate', 'forExpirationPurpose', 'id', 'isCancelable', 'isPublicOrder', 'measurementType', 'monthlyPaymentAmount', 'notFoc', 'numberOfMonths', 'paymentAmount', 'paymentAmountGst', 'startDate', 'tenant.id', 'updatedAt', 'tenant.tenantCompany', 'transactionStatus'];
        const orderParser = new Parser({ fields });
        const order_csv = orderParser.parse(order_list);
        context.bindings.orderOutputBlob = order_csv;

        context.log('order update success');
        
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: {
                'status': 'success'
            }
        };
        context.log('run success');
    }
    
}