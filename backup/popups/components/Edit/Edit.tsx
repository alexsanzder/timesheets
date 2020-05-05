import React from "react";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import TextField from "@material-ui/core/TextField";
import CssBaseline from "@material-ui/core/CssBaseline";
import Container from "@material-ui/core/Container";
import Slide from "@material-ui/core/Slide";
import { TransitionProps } from "@material-ui/core/transitions";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";

import TicketsAutocomplete from "../TicketsSelect";
import ProjectsAutocomplete from "../ProjectsSelect";

import { AppContext } from "../../contexts/AppProvider";
import GoogleAuthContext from "../../contexts/useGoogleAuth";
import {
  getSeconds,
  getFraction,
  getTimeFormated,
  getTimeFromSeconds
} from "../../utils/time";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    paper: {
      marginTop: theme.spacing(8),
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    },
    form: {
      width: "100%", // Fix IE 11 issue.
      marginTop: theme.spacing(1)
    },
    timer: {
      textAlign: "center",
      fontSize: 30
    },
    divider: { margin: theme.spacing(2, 0, 3) }
  })
);

const Transition = React.forwardRef<unknown, TransitionProps>(
  function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  }
);

export interface EditProps {
  open: boolean;
  handleClose: () => void;
  timer?: string;
  record: any;
  setRecord: (value: any) => void;
}

const Edit: React.FC<EditProps> = ({
  open,
  handleClose,
  timer,
  record,
  setRecord
}): JSX.Element => {
  const classes = useStyles();
  const { toggleReload, toggleRunning, running } = React.useContext(AppContext);
  const { updateRecord, deleteRecord } = React.useContext(GoogleAuthContext);
  const [time, setTime] = React.useState<string>("");

  React.useEffect(() => {
    setTime(getTimeFormated(record?.time));
  }, [record]);

  const handleUpdate = async (): Promise<void> => {
    const fraction = getFraction(getSeconds(timer ? timer : time));
    const response =
      updateRecord &&
      (await updateRecord(record.id, [
        null,
        null,
        record.company,
        record.project,
        record.description,
        record.ticket,
        fraction
      ]));
    const {
      result: { updatedRange }
    } = response;
    updatedRange && handleClose();
  };

  const handleDelete = async (): Promise<void> => {
    const index = timer
      ? record.id.replace(/(^.+\D)(\d+)(\D.+$)/i, "$2")
      : record.id.replace("aSa!A", "");
    const response = deleteRecord && (await deleteRecord(parseInt(index)));
    toggleReload(true);
    toggleRunning(false);
    response && handleClose();
  };

  const handleChangeTime = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    //setRecord({ ...record, time: event.target.value });
    setTime(event.target.value);
  };

  const handleChangeDecription = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setRecord({ ...record, description: event.target.value });
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
    >
      <Container component="main" maxWidth="xs">
        <div className={classes.paper}>
          <CssBaseline />
          <form className={classes.form} noValidate>
            <TextField
              variant="outlined"
              margin="normal"
              fullWidth
              name="time"
              inputProps={{ className: classes.timer }}
              InputProps={{
                readOnly: running
              }}
              value={timer ? timer : time}
              onChange={handleChangeTime}
            />
            <TextField
              variant="outlined"
              margin="normal"
              fullWidth
              name="description"
              placeholder="What are you working on?"
              value={record?.description}
              onChange={handleChangeDecription}
            />
            <ProjectsAutocomplete record={record} setRecord={setRecord} />
            <TicketsAutocomplete record={record} setRecord={setRecord} />
            <Divider className={classes.divider} />
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  color="primary"
                  onClick={handleUpdate}
                >
                  Done
                </Button>
              </Grid>
              <Grid item xs>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  color="default"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              </Grid>
              <Grid item xs>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  color="secondary"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </Grid>
            </Grid>
          </form>
        </div>
      </Container>
    </Dialog>
  );
};

export default Edit;