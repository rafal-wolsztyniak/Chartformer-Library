var ChartFormer = {
    source: null,
    google: function(type, source){

        var output = {
            columns: source.columns,
            columnConfiguration: [],
            data: []
        }

        // Check if the data extension is shared
        source.memberId = Platform.Recipient.GetAttributeValue('memberid');
        if((source.deIsShared == true) 
            && (source.name.toLowerCase().indexOf('ent.') == -1)
            && (Platform.Recipient.GetAttributeValue('memberid') != source.eid)
            ){
                source.name = 'ENT.' + source.name;
        }
        //Display(source);

        // Check what DE columns were provided, if none, get an array representing the columns in the order they are in the data extension (wsProxy retrieve + sorting by the Ordinal value)             
        output.temp = this.Function.getColumnsWithDatatypes(source.key, source.lookupColumn)
        //Display(output.temp, "gold");
        if(source.columns.length == 0){
            output.columns = output.temp.columns;
            Display("no columns!", "pink");
        }
        Display(output);
        output.columnConfiguration = output.temp.columnConfiguration;
        delete output.temp
        // end: column retrieve



        // Retrieve the data
        var data = Platform.Function.LookupRows(source.name, source.lookupColumn, source.lookupValue)
        Display(data);

        var headerCharts = "lineClassic area steppedArea bar column pie bubble";
        if (headerCharts.indexOf(type) > -1){
            output.data = this.Function.transformIntoArrayOfArrays(data, true);
        } else {
            output.data = this.Function.transformIntoArrayOfArrays(data, false);
        }
        Display(output)
        return output;
    },


    Function: {

        transformIntoArrayOfArrays: function(data, includeHeaders){
            // Array of objects -> Array of Arrays in the Google Chart Format
            if (data.length > 0){
                var rows = [];
                // conditionally add a header row with column names
                if (includeHeaders == true){
                    var headerRow = data[0];
                    delete headerRow['_CustomObjectKey'];
                    delete headerRow[source.lookupColumn];
                    rows.push(this.splitKeyValue(headerRow).Keys)
                }
                // add  row with values
                for (d in data){
                    var record = data[d];
                    var row = {};
                    //Display(output, "gold");
                    for(c in output.columns){
                        var property = output.columns[c];
                        if (property != null){
                            row[property] = record[property];
                            if ((record[property] == null) || (record[property] == '') || (record[property] == undefined)){
                                row[property] = null;
                            }
                            //Display(property, 'lightpink');
                        }
                    }
                    //Display(row, "lightblue");
                    var row = this.splitKeyValue(row).Values;
                    rows.push(row);
                }
            }
            return rows;
        },
        
        
        wsProxy: function(c) {
            // Will be needed to get all columns of the DE
            var proxy = new Script.Util.WSProxy();
            var options = {BatchSize: 2000};
            var properties = { QueryAllAccounts: source.deIsShared};
            try {
                if (c.method == "retrieve"){

                    if(c.filter != undefined){
                        return proxy.retrieve(c.object, c.columns, c.filter, options, properties);
                    } else {
                        return proxy.retrieve(c.object, c.columns);
                    }
                } else if (c.method == "describe"){
                    return proxy.describe(c.object);
                }

            } catch (error) {
                Display(error, "lightcoral");
            }
        },


        splitKeyValue: function(object) {
            // Returns an object split into two arrays with keys and values
            // From Ivan Rezine: https://ampscript.xyz/tips-and-tricks/5-ways-adding-updating-records/
            var out = { Keys: [], Values: [] };
            for(k in object) {
                out.Keys.push(k);
                out.Values.push(object[k]);
            }
            return out;
        },


        getColumnsWithDatatypes: function(key, lookupColumn){
            // Get all columns of the data extension with WS Proxy
            var config = {
                method: "retrieve",
                object: "DataExtensionField",
                columns: [
                    "Name",
                    "FieldType",
                    "Ordinal"
                    ],
                filter:{
                    Property: "DataExtension.CustomerKey",
                    SimpleOperator: "equals",
                    Value: source.key
                }
            }
            var DeFields = this.wsProxy(config);

            // This will be the final object that wil be returned from this function
            var DeColumns =  {
                                columns: [],
                                columnConfiguration: []
                            }
            Display(source);
            // Transform data extension data types into JS data types
            for (i = 0; i < DeFields.Results.length; i++){

                for (c in DeFields.Results){
                    var column = DeFields.Results[c]
                    if ((column.Ordinal == i) && (column.Name != source.lookupColumn)){
                        var dataType = column.FieldType;
                        DeColumns.columns.push(column.Name);
                        if (
                            (dataType == "Date") ||
                            (dataType == "Phone") ||
                            (dataType == "Text") ||
                            (dataType == "Locale") ||
                            (dataType == "EmailAddress")
                        ){
                            dataType = "string"
                        }
                        else if(
                            (dataType == "Boolean")
                        ){
                            dataType = "boolean"
                        }
                        else if(
                            (dataType == "Number") ||
                            (dataType == "Decimal") 
                        ){
                            dataType = "number"
                        }
                        DeColumns.columnConfiguration.push(
                            {name: column.Name, 
                            type: dataType}
                        );
                    }
                }
            }

            // When the user lists columns, only their configuration should be selected and they should be listed in the same order as specified
            if (source.columns.length > 0){
                DeColumns.tempArray = [];
                for (c in source.columns){
                    for (d in DeColumns.columnConfiguration){
                        if (DeColumns.columnConfiguration[d].name == source.columns[c]){
                            DeColumns.tempArray.push(DeColumns.columnConfiguration[d])
                        }
                    }
                }
                DeColumns.columnConfiguration = DeColumns.tempArray;
                delete DeColumns.tempArray;
            }
            return DeColumns
        }
    } // FUNCTION 
}